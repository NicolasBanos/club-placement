import pandas as pd
from io import BytesIO


# Expected column names — easy to update when you get the real format
REQUIRED_COLUMNS = [
    "first_name",
    "last_name",
    "grade",
    "teacher",
    "club_name",
    "family_email"
]

OPTIONAL_COLUMNS = [
    "dismissal_method",  # car, JCC, walker
    "parent_first_name",
    "parent_last_name",
    "parent_phone"
]


def read_spreadsheet(file_content: bytes, filename: str) -> pd.DataFrame:
    """
    Read an uploaded spreadsheet file and return a DataFrame.
    Supports .xlsx, .xls, and .csv files.
    """
    if filename.endswith(".csv"):
        return pd.read_csv(BytesIO(file_content))
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        return pd.read_excel(BytesIO(file_content))
    else:
        raise ValueError(f"Unsupported file type: {filename}. Please upload .xlsx, .xls, or .csv")


def validate_spreadsheet(df: pd.DataFrame) -> dict:
    """
    Validate the spreadsheet data before importing.
    Returns a report of errors and warnings.
    """
    errors = []
    warnings = []
    valid_rows = []
    invalid_rows = []

    # Check required columns exist
    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        return {
            "valid": False,
            "errors": [f"Missing required columns: {missing_columns}"],
            "warnings": [],
            "valid_rows": [],
            "invalid_rows": []
        }

    # Check each row
    for index, row in df.iterrows():
        row_errors = []
        row_num = index + 2  # +2 because index starts at 0 and row 1 is headers

        # Check required fields are not empty
        for col in REQUIRED_COLUMNS:
            if pd.isna(row[col]) or str(row[col]).strip() == "":
                row_errors.append(f"Row {row_num}: Missing {col}")

        # Validate grade is a number between 0-5
        if not pd.isna(row.get("grade")):
            try:
                grade = int(row["grade"])
                if grade < 0 or grade > 5:
                    row_errors.append(f"Row {row_num}: Grade must be between 0 and 5, got {grade}")
            except ValueError:
                row_errors.append(f"Row {row_num}: Grade must be a number, got '{row['grade']}'")

        # Validate email format
        if not pd.isna(row.get("family_email")):
            email = str(row["family_email"])
            if "@" not in email or "." not in email:
                row_errors.append(f"Row {row_num}: Invalid email format '{email}'")

        if row_errors:
            errors.extend(row_errors)
            invalid_rows.append(row_num)
        else:
            valid_rows.append(row_num)

    return {
        "valid": len(errors) == 0,
        "total_rows": len(df),
        "valid_rows": len(valid_rows),
        "invalid_rows": len(invalid_rows),
        "errors": errors,
        "warnings": warnings
    }


def parse_spreadsheet(df: pd.DataFrame, clubs: list) -> dict:
    """
    Parse validated spreadsheet data into our data structure.
    Also checks if club names match existing clubs.
    """
    club_names = [c["name"] for c in clubs] if clubs else []
    students = []
    unknown_clubs = []

    for index, row in df.iterrows():
        # Check if club exists
        club_name = str(row["club_name"]).strip()
        if club_names and club_name not in club_names:
            if club_name not in unknown_clubs:
                unknown_clubs.append(club_name)

        student = {
            "first_name": str(row["first_name"]).strip(),
            "last_name": str(row["last_name"]).strip(),
            "grade": int(row["grade"]),
            "teacher": str(row["teacher"]).strip(),
            "assigned_club": club_name,
            "family_email": str(row["family_email"]).strip(),
            "dismissal_method": str(row.get("dismissal_method", "car")).strip(),
        }
        students.append(student)

    return {
        "students": students,
        "total": len(students),
        "unknown_clubs": unknown_clubs
    }


def generate_template() -> bytes:
    """
    Generate a downloadable Excel template for coordinators to fill out.
    """
    template_data = {
        "first_name": ["Emily", "Jake"],
        "last_name": ["Smith", "Smith"],
        "grade": [1, 4],
        "teacher": ["Mrs. Johnson", "Mr. Davis"],
        "club_name": ["Amazing Art Club", "Mind Matters"],
        "family_email": ["smith@email.com", "smith@email.com"],
        "dismissal_method": ["car", "car"],
        "parent_first_name": ["John", "John"],
        "parent_last_name": ["Smith", "Smith"],
        "parent_phone": ["754-555-1234", "754-555-1234"]
    }

    df = pd.DataFrame(template_data)
    output = BytesIO()
    df.to_excel(output, index=False)
    return output.getvalue()

def import_students(df, db, school_id: int) -> dict:
    """
    Import validated spreadsheet rows into the database.

    Per row (in order):
      - unknown club        -> skipped ("unknown club")
      - duplicate student   -> skipped ("already exists")  [first+last+teacher, case-insensitive]
      - grade not eligible  -> skipped ("grade not eligible")
      - otherwise: reuse-or-create family by email, create student, then
        assign to club if room, else add to the club's waitlist.

    Returns a detailed report separating enrolled / waitlisted / skipped.
    """
    # Imported here to avoid circular imports at module load
    from models.club import Club
    from models.family import Family
    from models.student import Student
    from models.assignment import Assignment
    from models.waitlist import Waitlist
    from datetime import date

    enrolled = []
    waitlisted = []
    skipped = []
    families_created = 0
    students_created = 0

    # Preload clubs by lowercased name for matching
    clubs = db.query(Club).all()
    club_by_name = {c.name.strip().lower(): c for c in clubs}

    for index, row in df.iterrows():
        row_num = index + 2  # header is row 1
        first = str(row["first_name"]).strip()
        last = str(row["last_name"]).strip()
        teacher = str(row["teacher"]).strip()
        club_name = str(row["club_name"]).strip()
        email = str(row["family_email"]).strip()
        student_label = f"{first} {last}"

        # 1. Unknown club?
        club = club_by_name.get(club_name.lower())
        if not club:
            skipped.append({"row": row_num, "student": student_label, "club": club_name, "reason": "unknown club"})
            continue

        # 2. Duplicate student? (first + last + teacher, case-insensitive)
        existing = db.query(Student).filter(
            Student.first_name.ilike(first),
            Student.last_name.ilike(last),
            Student.teacher.ilike(teacher),
        ).first()
        if existing:
            skipped.append({"row": row_num, "student": student_label, "club": club_name, "reason": "already exists"})
            continue

        # 3. Grade eligibility
        grade = int(row["grade"])
        if grade < club.grade_min or grade > club.grade_max:
            skipped.append({"row": row_num, "student": student_label, "club": club_name, "reason": "grade not eligible"})
            continue

        # 4. Reuse-or-create family by email
        family = db.query(Family).filter(Family.email.ilike(email)).first()
        if not family:
            parent_last = str(row.get("parent_last_name", "")).strip() or last
            family = Family(
                family_name=parent_last,
                dismissal_method=str(row.get("dismissal_method", "car")).strip() or "car",
                parent_first_name=str(row.get("parent_first_name", "")).strip(),
                parent_last_name=parent_last,
                phone=str(row.get("parent_phone", "")).strip(),
                email=email,
                school_id=school_id,
            )
            db.add(family)
            db.flush()  # get family.id without full commit
            families_created += 1

        # Create the student
        student = Student(
            first_name=first,
            last_name=last,
            grade=grade,
            teacher=teacher,
            family_id=family.id,
        )
        db.add(student)
        db.flush()
        students_created += 1

        # 5. Assign if room, else waitlist
        enrolled_count = db.query(Assignment).filter(Assignment.club_id == club.id).count()
        if enrolled_count < club.max_students:
            db.add(Assignment(
                student_id=student.id,
                club_id=club.id,
                assigned_date=date.today().isoformat(),
            ))
            enrolled.append({"row": row_num, "student": student_label, "club": club.name})
        else:
            last_pos = db.query(Waitlist).filter(Waitlist.club_id == club.id).count()
            db.add(Waitlist(
                student_id=student.id,
                club_id=club.id,
                position=last_pos + 1,
                pending_confirmation=False,
            ))
            waitlisted.append({"row": row_num, "student": student_label, "club": club.name, "position": last_pos + 1})

    db.commit()

    return {
        "enrolled": enrolled,
        "waitlisted": waitlisted,
        "skipped": skipped,
        "counts": {
            "enrolled": len(enrolled),
            "waitlisted": len(waitlisted),
            "skipped": len(skipped),
            "families_created": families_created,
            "students_created": students_created,
        },
    }

def rows_to_df(rows: list) -> "pd.DataFrame":
    """Convert a list of row dicts (from the frontend grid) into a DataFrame."""
    return pd.DataFrame(rows)


def validate_rows(rows: list, db=None) -> dict:
    """
    Validate edited row data from the frontend grid.
    Returns structured per-cell errors (block import) and warnings (allow import).
      cell_errors:   [{row_index, column, message}]  -> hard problems, block import
      cell_warnings: [{row_index, column, message}]  -> soft (e.g. duplicate), still imports
    DB-aware checks (club existence, grade eligibility, duplicates) run when db is provided.
    """
    from models.club import Club
    from models.student import Student

    cell_errors = []
    cell_warnings = []

    missing_columns = [col for col in REQUIRED_COLUMNS if not rows or col not in rows[0]]
    if missing_columns:
        return {
            "valid": False,
            "structural_error": f"Missing required columns: {missing_columns}",
            "cell_errors": [],
            "cell_warnings": [],
            "total_rows": len(rows),
            "valid_rows": 0,
            "invalid_rows": len(rows),
        }

    # Preload clubs for existence + grade checks
    clubs = db.query(Club).all() if db is not None else []
    club_by_name = {c.name.strip().lower(): c for c in clubs}

    invalid_row_indices = set()

    for i, row in enumerate(rows):
        # Required fields present
        for col in REQUIRED_COLUMNS:
            val = row.get(col)
            if val is None or str(val).strip() == "":
                cell_errors.append({"row_index": i, "column": col, "message": f"Missing {col}"})
                invalid_row_indices.add(i)

        # Grade 0-5 numeric
        grade = None
        grade_val = row.get("grade")
        if grade_val is not None and str(grade_val).strip() != "":
            try:
                grade = int(grade_val)
                if grade < 0 or grade > 5:
                    cell_errors.append({"row_index": i, "column": "grade", "message": "Grade must be 0–5"})
                    invalid_row_indices.add(i)
                    grade = None
            except (ValueError, TypeError):
                cell_errors.append({"row_index": i, "column": "grade", "message": "Grade must be a number"})
                invalid_row_indices.add(i)
                grade = None

        # Email format
        email_val = row.get("family_email")
        if email_val is not None and str(email_val).strip() != "":
            email = str(email_val)
            if "@" not in email or "." not in email:
                cell_errors.append({"row_index": i, "column": "family_email", "message": "Invalid email format"})
                invalid_row_indices.add(i)

        # DB-aware checks
        if db is not None:
            club_name = str(row.get("club_name", "")).strip()
            club = club_by_name.get(club_name.lower()) if club_name else None

            # Unknown club (hard error)
            if club_name and not club:
                cell_errors.append({"row_index": i, "column": "club_name", "message": f"No club named '{club_name}'"})
                invalid_row_indices.add(i)

            # Grade-ineligible (hard error) — only if club known and grade parsed
            if club and grade is not None:
                if grade < club.grade_min or grade > club.grade_max:
                    cell_errors.append({"row_index": i, "column": "grade", "message": f"Grade {grade} not eligible for {club.name} (grades {club.grade_min}–{club.grade_max})"})
                    invalid_row_indices.add(i)

            # Duplicate student (warning) — first+last+teacher, case-insensitive
            first = str(row.get("first_name", "")).strip()
            last = str(row.get("last_name", "")).strip()
            teacher = str(row.get("teacher", "")).strip()
            if first and last and teacher:
                existing = db.query(Student).filter(
                    Student.first_name.ilike(first),
                    Student.last_name.ilike(last),
                    Student.teacher.ilike(teacher),
                ).first()
                if existing:
                    cell_warnings.append({"row_index": i, "column": "first_name", "message": "Already exists — will be skipped"})

    return {
        "valid": len(cell_errors) == 0,
        "structural_error": None,
        "cell_errors": cell_errors,
        "cell_warnings": cell_warnings,
        "total_rows": len(rows),
        "valid_rows": len(rows) - len(invalid_row_indices),
        "invalid_rows": len(invalid_row_indices),
    }
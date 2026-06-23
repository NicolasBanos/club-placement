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
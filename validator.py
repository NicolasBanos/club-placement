# Grade Validation Function
# Validates student choices but no longer blocks the lottery
# Invalid choices are voided and flagged in the report

def is_grade_valid(grade, club):
    """
    Check if a student's grade falls within a club's grade range
    Returns True if valid, False if not
    """
    return club["grade_min"] <= grade <= club["grade_max"]


def find_club_by_name(club_name, clubs):
    """
    Find a club dictionary by its name
    Returns the club if found, None if not
    """
    for club in clubs:
        if club["name"] == club_name:
            return club
    return None


def get_valid_choices(student, clubs):
    """
    Filter a student's choices down to only valid ones
    Removes duplicates, non-existent clubs, and grade-inappropriate clubs
    Returns a clean list of valid choices (up to 3)
    """
    valid_choices = []
    seen = set()

    for choice in student["choices"]:
        # Skip duplicates
        if choice in seen:
            continue
        seen.add(choice)

        club = find_club_by_name(choice, clubs)

        # Skip non-existent clubs
        if club is None:
            continue

        # Skip grade-inappropriate clubs
        if not is_grade_valid(student["grade"], club):
            continue

        valid_choices.append(choice)

    return valid_choices


def validate_all_families(families, clubs):
    """
    Validate every student in every family.
    Flags errors for admin awareness but does NOT block the lottery.
    Invalid choices are voided automatically.
    """
    total_errors = 0
    total_students = 0
    total_voided = 0

    print("=" * 50)
    print("VALIDATION REPORT")
    print("=" * 50)

    for family in families:
        family_has_errors = False

        for student in family["students"]:
            total_students += 1
            student_errors = []
            seen = set()

            for i, choice in enumerate(student["choices"]):
                # Check duplicate
                if choice in seen:
                    student_errors.append(
                        f"  ⚠️  Choice '{choice}' is a duplicate — voided"
                    )
                    total_voided += 1
                    continue
                seen.add(choice)

                club = find_club_by_name(choice, clubs)

                # Check club exists
                if club is None:
                    student_errors.append(
                        f"  ⚠️  Choice '{choice}' does not exist — voided"
                    )
                    total_voided += 1
                    continue

                # Check grade
                if not is_grade_valid(student["grade"], club):
                    student_errors.append(
                        f"  ⚠️  Choice '{choice}' is for grades "
                        f"{club['grade_min']}-{club['grade_max']}, "
                        f"but {student['name']} is grade {student['grade']} — voided"
                    )
                    total_voided += 1

            if student_errors:
                if not family_has_errors:
                    print(f"\nFamily: {family['family_name']} "
                          f"(ID: {family['family_id']})")
                    family_has_errors = True

                print(f"  Student: {student['name']} (Grade {student['grade']})")
                for error in student_errors:
                    print(error)
                total_errors += len(student_errors)

    print("\n" + "=" * 50)
    if total_errors == 0:
        print(f"✅ All {total_students} students passed validation!")
    else:
        print(f"ℹ️  {total_voided} invalid choices voided across "
              f"{total_students} students")
        print(f"ℹ️  Lottery will proceed with valid choices only")
    print("=" * 50)
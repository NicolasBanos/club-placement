# Grade Validation Function
# Checks if a student's club choices are valid for their grade level
# Also checks for duplicate choices

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


def validate_student_choices(student, clubs):
    """
    Validate all 3 choices for a single student
    Returns a list of errors found (empty list means no errors)
    """
    errors = []

    # Check for duplicate choices
    if len(student["choices"]) != len(set(student["choices"])):
        errors.append(f"  ❌ Duplicate club choices detected: {student['choices']}")

    # Check each choice
    for i, choice in enumerate(student["choices"]):
        club = find_club_by_name(choice, clubs)

        # Check if club exists
        if club is None:
            errors.append(f"  ❌ Choice {i+1} '{choice}' does not exist")
            continue

        # Check if grade is appropriate
        if not is_grade_valid(student["grade"], club):
            errors.append(
                f"  ❌ Choice {i+1} '{choice}' is for grades "
                f"{club['grade_min']}-{club['grade_max']}, "
                f"but {student['name']} is in grade {student['grade']}"
            )

    return errors


def validate_all_families(families, clubs):
    """
    Validate every student in every family
    Prints a full report of all errors found
    Returns True if no errors, False if errors were found
    """
    total_errors = 0
    total_students = 0

    print("=" * 50)
    print("VALIDATION REPORT")
    print("=" * 50)

    for family in families:
        family_has_errors = False

        for student in family["students"]:
            total_students += 1
            errors = validate_student_choices(student, clubs)

            if errors:
                if not family_has_errors:
                    print(f"\nFamily: {family['family_name']} (ID: {family['family_id']})")
                    family_has_errors = True

                print(f"  Student: {student['name']} (Grade {student['grade']})")
                for error in errors:
                    print(error)
                total_errors += len(errors)

    print("\n" + "=" * 50)
    if total_errors == 0:
        print(f"✅ All {total_students} students passed validation!")
    else:
        print(f"⚠️  Found {total_errors} errors across {total_students} students")
    print("=" * 50)

    return total_errors == 0


# Test it with our sample families from families.py
from families import families
from clubs import clubs

validate_all_families(families, clubs)
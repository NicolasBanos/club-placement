from clubs import clubs
from generate_test_data import generate_families
families = generate_families(100)
from lottery import run_lottery
from validator import validate_all_families, is_grade_valid, find_club_by_name, get_valid_choices
from waitlist import process_waitlists, print_waitlist_report

def assign_student_to_club(student, club_name, clubs):
    """
    Try to assign a student to a specific club.
    Returns True if successful, False if not (full or wrong grade)
    """
    club = find_club_by_name(club_name, clubs)

    # Club doesn't exist
    if club is None:
        return False

    # Grade not appropriate
    if not is_grade_valid(student["grade"], club):
        return False

    # Club is full
    if len(club["enrolled"]) >= club["max_students"]:
        return False

    # All checks passed — assign the student
    club["enrolled"].append(student["name"])
    student["assigned_club"] = club_name
    return True


def process_family(family, clubs):
    """
    Process all students in a family using round-based assignment.
    Uses only valid choices — invalid ones are automatically skipped.
    Round 1: try everyone's 1st valid choice
    Round 2: try everyone's 2nd valid choice if not yet assigned
    Round 3: try everyone's 3rd valid choice if not yet assigned
    """
    # First get valid choices for each student
    for student in family["students"]:
        student["valid_choices"] = get_valid_choices(student, clubs)

    # Process in rounds
    max_rounds = max(
        (len(s["valid_choices"]) for s in family["students"]),
        default=0
    )

    for round_num in range(max_rounds):
        for student in family["students"]:
            # Skip if already assigned
            if student["assigned_club"] is not None:
                continue

            # Skip if no choice for this round
            if round_num >= len(student["valid_choices"]):
                continue

            choice = student["valid_choices"][round_num]
            assign_student_to_club(student, choice, clubs)


def run_assignment(families, clubs):
    """
    Run the full lottery and assignment process:
    1. Validate all choices — flag but don't block
    2. Randomize family order
    3. Process each family in lottery order
    """
    print("=" * 50)
    print("STARTING CLUB ASSIGNMENT LOTTERY")
    print("=" * 50)

    # Step 1 - Validate first (informational only)
    print("\nStep 1: Validating all student choices...")
    validate_all_families(families, clubs)

    # Step 2 - Run lottery
    print("\nStep 2: Running lottery randomizer...")
    lottery_order = run_lottery(families)
    print(f"✅ {len(lottery_order)} families randomized")

    # Step 3 - Assign clubs
    print("\nStep 3: Assigning clubs...")
    for family in lottery_order:
        process_family(family, clubs)

    print("✅ Assignment complete!")

    # Step 4 - Process waitlists
    print("\nStep 4: Processing waitlists...")
    process_waitlists(families, clubs)
    print("✅ Waitlists processed!")


def print_results(families, clubs):
    """
    Print a full summary of assignments and waitlists
    """
    print("\n" + "=" * 50)
    print("ASSIGNMENT RESULTS")
    print("=" * 50)

    # Print each family's results
    for family in families:
        print(f"\nFamily: {family['family_name']}")
        for student in family["students"]:
            if student["assigned_club"]:
                print(f"  ✅ {student['name']} (Grade {student['grade']}) "
                      f"→ {student['assigned_club']}")
            else:
                print(f"  ⚠️  {student['name']} (Grade {student['grade']}) "
                      f"→ Not assigned yet")

    # Print club enrollment summary
    print("\n" + "=" * 50)
    print("CLUB ENROLLMENT SUMMARY")
    print("=" * 50)
    for club in clubs:
        spots_left = club["max_students"] - len(club["enrolled"])
        print(f"\n{club['name']}")
        print(f"  Enrolled: {len(club['enrolled'])}/{club['max_students']} "
              f"({spots_left} spots left)")
        for name in club["enrolled"]:
            print(f"    - {name}")


if __name__ == "__main__":
    run_assignment(families, clubs)
    print_results(families, clubs)
    print_waitlist_report(clubs, families)
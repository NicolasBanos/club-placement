from datetime import datetime, timedelta
from waitlist import add_to_waitlist
from validator import find_club_by_name

def mark_absent(student, family, clubs, absence_date):
    """
    Mark a student as absent on the first day.
    Flags them as pending excuse and sets the excuse deadline (3 days).
    Notifies admin immediately.
    """
    student["attendance_status"] = "pending_excuse"
    student["absence_date"] = absence_date
    student["excuse_deadline"] = (
        datetime.strptime(absence_date, "%Y-%m-%d") + timedelta(days=3)
    ).strftime("%Y-%m-%d")

    print(f"🔔 ADMIN NOTIFICATION:")
    print(f"   {student['name']} from family {family['family_name']} "
          f"was absent on {absence_date}.")
    print(f"   Excuse deadline: {student['excuse_deadline']}")
    print()


def submit_excuse(student, is_valid):
    """
    Submit an excuse for an absent student.
    If valid → student stays in club.
    If invalid or not submitted → student gets withdrawn.
    """
    if is_valid:
        student["attendance_status"] = "excused"
        print(f"✅ Valid excuse submitted for {student['name']} — "
              f"they remain in {student['assigned_club']}")
    else:
        student["attendance_status"] = "excuse_denied"
        print(f"❌ Excuse denied for {student['name']}")


def check_excuse_deadlines(families, clubs, current_date):
    """
    Check all pending excuses.
    If deadline has passed without a valid excuse → withdraw student
    and promote first waitlisted student.
    """
    print("=" * 50)
    print("CHECKING EXCUSE DEADLINES")
    print("=" * 50)

    current = datetime.strptime(current_date, "%Y-%m-%d")

    for family in families:
        for student in family["students"]:
            if student.get("attendance_status") != "pending_excuse":
                continue

            deadline = datetime.strptime(student["excuse_deadline"], "%Y-%m-%d")

            if current > deadline:
                print(f"\n⏰ Deadline passed for {student['name']} — withdrawing...")
                withdraw_student(student, family, clubs)


def withdraw_student(student, family, clubs):
    """
    Withdraw a student from their club.
    Promotes the first waitlisted student to fill the spot.
    Notifies both families.
    """
    club_name = student["assigned_club"]
    club = find_club_by_name(club_name, clubs)

    # Remove from enrolled
    if student["name"] in club["enrolled"]:
        club["enrolled"].remove(student["name"])

    # Update student status
    student["assigned_club"] = None
    student["attendance_status"] = "withdrawn"

    # Notify withdrawn student's family
    print(f"📧 NOTIFICATION TO {family['family_name']} family:")
    print(f"   {student['name']} has been withdrawn from {club_name} "
          f"due to unexcused absence on the first day.")
    print()

    # Promote first waitlisted student
    promote_from_waitlist(club, clubs)


def promote_from_waitlist(club, clubs):
    """
    Promote the first student on the waitlist to fill an open spot.
    Notifies their family.
    """
    if not club["waitlist"]:
        print(f"ℹ️  No students on waitlist for {club['name']}")
        return

    # Get first student on waitlist
    promoted_name = club["waitlist"].pop(0)

    # Add to enrolled
    club["enrolled"].append(promoted_name)

    # Notify promoted student's family
    print(f"🎉 NOTIFICATION TO family of {promoted_name}:")
    print(f"   {promoted_name} has been promoted from the waitlist "
          f"and is now enrolled in {club['name']}!")
    print()


# Test the first day confirmation logic
if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    # Run the lottery first
    run_assignment(families, clubs)
    process_waitlists(families, clubs)

    print("\n" + "=" * 50)
    print("FIRST DAY SIMULATION")
    print("=" * 50)

    # Simulate first day — mark first student as absent
    test_family = families[0]
    test_student = test_family["students"][0]

    print(f"\nSimulating absence for: {test_student['name']}")
    print(f"Assigned club: {test_student['assigned_club']}")
    print()

    # Mark them absent
    mark_absent(test_student, test_family, clubs, "2024-10-28")

    # Simulate 4 days passing with no excuse submitted
    print("--- 4 days pass with no excuse submitted ---\n")
    check_excuse_deadlines(families, clubs, "2024-11-01")

    # Simulate another student submitting a valid excuse
    test_family2 = families[1]
    test_student2 = test_family2["students"][0]

    if test_student2["assigned_club"]:
        print(f"\nSimulating absence + valid excuse for: {test_student2['name']}")
        mark_absent(test_student2, test_family2, clubs, "2024-10-28")
        submit_excuse(test_student2, is_valid=True)
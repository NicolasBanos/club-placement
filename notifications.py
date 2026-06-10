from datetime import datetime

def send_acceptance_notification(student, family, club):
    """
    Notify a family that their child has been accepted into a club.
    """
    print(f"📧 ACCEPTANCE NOTIFICATION")
    print(f"   To: {family['email']}")
    print(f"   Dear {family['parent_name']},")
    print(f"   {student['name']} has been accepted into {club['name']}!")
    print(f"   Room: {club['room_number']}")
    print(f"   Dismissal: {club['dismissal_location']}")
    print(f"   First meeting: {club['meeting_dates'][0]}")
    print()


def send_waitlist_notification(student, family, clubs):
    """
    Notify a family that their child is on the waitlist.
    """
    from validator import find_club_by_name

    print(f"📧 WAITLIST NOTIFICATION")
    print(f"   To: {family['email']}")
    print(f"   Dear {family['parent_name']},")
    print(f"   Unfortunately {student['name']} was not assigned to a club.")
    print(f"   They have been placed on the following waitlists:")

    for club_name in student["waitlist"]:
        club = find_club_by_name(club_name, clubs)
        position = club["waitlist"].index(student["name"]) + 1
        print(f"   - {club_name}: position #{position}")
    print()


def send_withdrawal_notification(student, family, club_name):
    """
    Notify a family that their child has been withdrawn from a club.
    """
    print(f"📧 WITHDRAWAL NOTIFICATION")
    print(f"   To: {family['email']}")
    print(f"   Dear {family['parent_name']},")
    print(f"   {student['name']} has been withdrawn from {club_name} "
          f"due to an unexcused absence on the first day.")
    print(f"   Please contact the school if you have any questions.")
    print()


def send_promotion_notification(student_name, family, club_name):
    """
    Notify a family that their child has been promoted from the waitlist.
    """
    print(f"📧 WAITLIST PROMOTION NOTIFICATION")
    print(f"   To: {family['email']}")
    print(f"   Dear {family['parent_name']},")
    print(f"   Great news! {student_name} has been promoted from the waitlist")
    print(f"   and is now enrolled in {club_name}!")
    print(f"   Please make sure they attend the next meeting.")
    print()


def send_admin_absence_notification(student, family, excuse_deadline):
    """
    Notify admin when a student is absent on the first day.
    """
    print(f"🔔 ADMIN ABSENCE NOTIFICATION")
    print(f"   Student: {student['name']}")
    print(f"   Family: {family['family_name']}")
    print(f"   Club: {student['assigned_club']}")
    print(f"   Excuse deadline: {excuse_deadline}")
    print()


def notify_all_assignments(families, clubs):
    """
    Send acceptance or waitlist notifications to all families
    after the lottery runs.
    """
    from validator import find_club_by_name

    print("=" * 50)
    print("SENDING ASSIGNMENT NOTIFICATIONS")
    print("=" * 50)
    print()

    for family in families:
        for student in family["students"]:
            if student["assigned_club"]:
                club = find_club_by_name(student["assigned_club"], clubs)
                send_acceptance_notification(student, family, club)
            elif student["waitlist"]:
                send_waitlist_notification(student, family, clubs)


# Test the notification system
if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    # Run lottery first
    run_assignment(families, clubs)
    process_waitlists(families, clubs)

    # Send all notifications
    notify_all_assignments(families, clubs)
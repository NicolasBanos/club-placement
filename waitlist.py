from validator import get_valid_choices, find_club_by_name

def add_to_waitlist(student, clubs):
    """
    Add a student to the waitlist for each of their valid choices
    that are full. Only adds to waitlist if club is full and
    student is not already assigned to that club.
    """
    valid_choices = get_valid_choices(student, clubs)

    for choice in valid_choices:
        club = find_club_by_name(choice, clubs)

        # Skip if this is their assigned club
        if student["assigned_club"] == choice:
            continue

        # Skip if club still has space
        if len(club["enrolled"]) < club["max_students"]:
            continue

        # Add to waitlist if not already on it
        if student["name"] not in club["waitlist"]:
            club["waitlist"].append(student["name"])
            student["waitlist"].append(choice)


def process_waitlists(families, clubs):
    """
    After assignment is complete, go through all unassigned
    students and add them to waitlists for their valid choices
    """
    for family in families:
        for student in family["students"]:
            if student["assigned_club"] is None:
                add_to_waitlist(student, clubs)


def print_waitlist_report(clubs, families):
    """
    Print a full waitlist report for all clubs
    and a summary of waitlisted students
    """
    print("\n" + "=" * 50)
    print("WAITLIST REPORT")
    print("=" * 50)

    any_waitlisted = False

    for club in clubs:
        if club["waitlist"]:
            any_waitlisted = True
            print(f"\n{club['name']}")
            print(f"  Enrolled: {len(club['enrolled'])}/{club['max_students']} (FULL)")
            print(f"  Waitlist ({len(club['waitlist'])} students):")
            for position, name in enumerate(club["waitlist"], 1):
                print(f"    {position}. {name}")

    if not any_waitlisted:
        print("\n✅ No waitlists — all students were assigned!")

    # Print unassigned students summary
    print("\n" + "=" * 50)
    print("UNASSIGNED STUDENTS")
    print("=" * 50)

    unassigned = []
    for family in families:
        for student in family["students"]:
            if student["assigned_club"] is None:
                unassigned.append(student)

    if not unassigned:
        print("✅ All students were assigned to a club!")
    else:
        for student in unassigned:
            print(f"\n  {student['name']} (Grade {student['grade']})")
            if student["waitlist"]:
                print(f"  Waitlisted for: {', '.join(student['waitlist'])}")
            else:
                print(f"  ⚠️  No valid choices available — not on any waitlist")
from validator import find_club_by_name


def check_sibling_dismissal_conflict(family, clubs):
    """
    Check if siblings in the same family are assigned to clubs
    with different dismissal locations.
    Returns a conflict message if found, None if no conflict.
    """
    dismissal_locations = set()

    for student in family["students"]:
        if student["assigned_club"]:
            club = find_club_by_name(student["assigned_club"], clubs)
            dismissal_locations.add(club["dismissal_location"])

    if len(dismissal_locations) > 1:
        return ("Please note that your children are dismissed from different "
                "locations. Please instruct your older child to go to the "
                "younger child's dismissal location.")
    return None


def generate_acceptance_letter(family, clubs):
    """
    Generate an acceptance letter for a family.
    Includes all assigned students, their club details,
    and a sibling dismissal note if needed.
    """
    assigned_students = [s for s in family["students"] if s["assigned_club"]]
    if not assigned_students:
        return None

    letter = []
    letter.append("=" * 60)
    letter.append("PLANTATION PARK ELEMENTARY SCHOOL")
    letter.append("After School Enrichment Clubs")
    letter.append("=" * 60)
    letter.append("")
    letter.append(f"Dear {family['parent_name']},")
    letter.append("")
    letter.append(
        "Thank you for submitting an application for our Afterschool "
        "Enrichment Clubs. Listed below is your child's club assignment, "
        "the room number where they will meet and their dismissal location."
    )
    letter.append("")

    for student in assigned_students:
        club = find_club_by_name(student["assigned_club"], clubs)
        letter.append(f"Student: {student['name']}")
        letter.append(f"Club Assignment: {club['name']}")
        letter.append(f"Meeting in Room: {club['room_number']}")
        letter.append(f"Dismissal Location: {club['dismissal_location']}")
        letter.append(f"First Meeting: {club['meeting_dates'][0]}")
        letter.append("")

    conflict_message = check_sibling_dismissal_conflict(family, clubs)
    if conflict_message:
        letter.append("⚠️  IMPORTANT SIBLING DISMISSAL NOTE:")
        letter.append(conflict_message)
        letter.append("")

    letter.append(
        "Your child MUST be in attendance on the first day of clubs as "
        "this will constitute his/her confirmation. Students not attending "
        "clubs the first day without a valid excuse will be withdrawn and "
        "their spot will be filled with a student from the waitlist."
    )
    letter.append("")
    letter.append(
        "As a reminder, Clubs will meet on Mondays from 2:10 pm to 3:10 pm. "
        "Students must be picked up at 3:10 at their assigned location. "
        "Please note that after two late pickups or two unexcused absences, "
        "your child will no longer be allowed to participate in Enrichment Clubs."
    )
    letter.append("")
    letter.append("We thank you in advance for your cooperation.")
    letter.append("")
    letter.append("Sincerely,")
    letter.append("PPE Enrichment Club Coordinator")
    letter.append("=" * 60)

    return "\n".join(letter)


def generate_all_acceptance_letters(families, clubs):
    """
    Generate and print all acceptance letters.
    """
    print("\n" + "=" * 60)
    print("GENERATING ACCEPTANCE LETTERS")
    print("=" * 60)

    count = 0
    for family in families:
        letter = generate_acceptance_letter(family, clubs)
        if letter:
            print(letter)
            print()
            count += 1

    print(f"Generated {count} acceptance letters")


if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    run_assignment(families, clubs)
    process_waitlists(families, clubs)
    generate_all_acceptance_letters(families, clubs)
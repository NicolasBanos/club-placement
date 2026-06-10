from validator import find_club_by_name


def generate_waitlist_letter(family, clubs):
    """
    Generate a waitlist letter for a family whose children
    were not assigned to any club.
    """
    waitlisted_students = [
        s for s in family["students"]
        if not s["assigned_club"] and s["waitlist"]
    ]

    if not waitlisted_students:
        return None

    letter = []
    letter.append("=" * 60)
    letter.append("PLANTATION PARK ELEMENTARY SCHOOL")
    letter.append("After School Enrichment Clubs — Waitlist Notice")
    letter.append("=" * 60)
    letter.append("")
    letter.append(f"Dear {family['parent_name']},")
    letter.append("")
    letter.append(
        "Thank you for submitting an application for our Afterschool "
        "Enrichment Clubs. Unfortunately, the clubs your child selected "
        "have reached maximum capacity. Your child has been placed on "
        "the waitlist for the following clubs:"
    )
    letter.append("")

    for student in waitlisted_students:
        letter.append(f"Student: {student['name']}")
        for club_name in student["waitlist"]:
            club = find_club_by_name(club_name, clubs)
            position = club["waitlist"].index(student["name"]) + 1
            letter.append(f"  - {club_name}: Waitlist Position #{position}")
        letter.append("")

    letter.append(
        "We will contact you if a spot becomes available. "
        "We appreciate your patience and hope to accommodate "
        "your child in a future session."
    )
    letter.append("")
    letter.append("Sincerely,")
    letter.append("PPE Enrichment Club Coordinator")
    letter.append("=" * 60)

    return "\n".join(letter)


def generate_all_waitlist_letters(families, clubs):
    """
    Generate and print all waitlist letters.
    """
    print("\n" + "=" * 60)
    print("GENERATING WAITLIST LETTERS")
    print("=" * 60)

    count = 0
    for family in families:
        letter = generate_waitlist_letter(family, clubs)
        if letter:
            print(letter)
            print()
            count += 1

    print(f"Generated {count} waitlist letters")


if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    run_assignment(families, clubs)
    process_waitlists(families, clubs)
    generate_all_waitlist_letters(families, clubs)
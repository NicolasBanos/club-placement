def generate_attendance_sheet(club):
    """
    Generate an attendance sheet for a single club.
    Rows = student names
    Columns = meeting dates
    """
    if not club["enrolled"]:
        return None

    sheet = []
    sheet.append("=" * 60)
    sheet.append("PLANTATION PARK ELEMENTARY SCHOOL")
    sheet.append("After School Enrichment Clubs — Attendance Sheet")
    sheet.append("=" * 60)
    sheet.append(f"Club: {club['name']}")
    sheet.append(f"Instructor: {club['instructor']}")
    sheet.append(f"Room: {club['room_number']}")
    sheet.append(f"Total Students: {len(club['enrolled'])}")
    sheet.append("")

    # Build header row with dates
    date_columns = "  ".join(club["meeting_dates"])
    sheet.append(f"{'Student Name':<25} {date_columns}")
    sheet.append("-" * 60)

    # Build a row for each student
    for student_name in sorted(club["enrolled"]):
        # Empty boxes for each date to mark attendance
        boxes = "  ".join(["[ ]"] * len(club["meeting_dates"]))
        sheet.append(f"{student_name:<25} {boxes}")

    sheet.append("=" * 60)
    return "\n".join(sheet)


def generate_all_attendance_sheets(clubs):
    """
    Generate attendance sheets for all clubs.
    """
    print("\n" + "=" * 60)
    print("GENERATING ATTENDANCE SHEETS")
    print("=" * 60)

    count = 0
    for club in clubs:
        sheet = generate_attendance_sheet(club)
        if sheet:
            print(sheet)
            print()
            count += 1

    print(f"Generated {count} attendance sheets")


if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    run_assignment(families, clubs)
    process_waitlists(families, clubs)
    generate_all_attendance_sheets(clubs)
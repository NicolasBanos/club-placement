def generate_club_summary_report(clubs, families):
    """
    Generate a summary report for staff showing:
    - Each club's enrollment status
    - Available spots
    - Full waitlist in order
    - Total students assigned vs waitlisted vs unassigned
    """

    # Count overall stats
    total_students = sum(len(f["students"]) for f in families)
    total_assigned = sum(
        1 for f in families
        for s in f["students"]
        if s["assigned_club"]
    )
    total_waitlisted = sum(
        1 for f in families
        for s in f["students"]
        if not s["assigned_club"] and s["waitlist"]
    )
    total_unassigned = sum(
        1 for f in families
        for s in f["students"]
        if not s["assigned_club"] and not s["waitlist"]
    )

    report = []
    report.append("=" * 60)
    report.append("PLANTATION PARK ELEMENTARY SCHOOL")
    report.append("After School Enrichment Clubs — Staff Summary Report")
    report.append("=" * 60)
    report.append("")
    report.append("OVERALL STATISTICS")
    report.append(f"  Total Students:   {total_students}")
    report.append(f"  Assigned:         {total_assigned}")
    report.append(f"  Waitlisted:       {total_waitlisted}")
    report.append(f"  Unassigned:       {total_unassigned}")
    report.append("")
    report.append("=" * 60)
    report.append("CLUB BREAKDOWN")
    report.append("=" * 60)

    for club in clubs:
        enrolled = len(club["enrolled"])
        max_students = club["max_students"]
        spots_left = max_students - enrolled
        waitlist_count = len(club["waitlist"])

        report.append("")
        report.append(f"Club: {club['name']}")
        report.append(f"  Instructor:   {club['instructor']}")
        report.append(f"  Room:         {club['room_number']}")
        report.append(f"  Grades:       {club['grade_min']} - {club['grade_max']}")
        report.append(f"  Enrollment:   {enrolled}/{max_students} "
                      f"({'FULL' if spots_left == 0 else f'{spots_left} spots left'})")

        # Enrolled students
        if club["enrolled"]:
            report.append(f"  Enrolled Students:")
            for name in sorted(club["enrolled"]):
                report.append(f"    - {name}")

        # Waitlist
        if club["waitlist"]:
            report.append(f"  Waitlist ({waitlist_count} students):")
            for position, name in enumerate(club["waitlist"], 1):
                report.append(f"    {position}. {name}")
        else:
            report.append(f"  Waitlist: None")

        report.append("")

    report.append("=" * 60)
    return "\n".join(report)


if __name__ == "__main__":
    from clubs import clubs
    from families import families
    from assignment import run_assignment
    from waitlist import process_waitlists

    run_assignment(families, clubs)
    process_waitlists(families, clubs)

    report = generate_club_summary_report(clubs, families)
    print(report)
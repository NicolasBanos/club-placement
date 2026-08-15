from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from models.user import User, UserRole
from models.club import Club
from models.family import Family
from models.student import Student
from models.assignment import Assignment
from models.waitlist import Waitlist
import random

router = APIRouter(prefix="/lottery", tags=["Lottery"])


def get_valid_choices(student, clubs):
    """Filter student choices to only grade-appropriate clubs"""
    valid = []
    seen = set()
    for choice_name in [student.choice1, student.choice2, student.choice3]:
        if not choice_name or choice_name in seen:
            continue
        seen.add(choice_name)
        club = next((c for c in clubs if c.name == choice_name), None)
        if club and club.grade_min <= student.grade <= club.grade_max:
            valid.append(club)
    return valid


@router.get("/families")
def get_families(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Get all families with their students and choices"""
    families = db.query(Family).all()

    result = []
    for family in families:
        students = db.query(Student).filter(Student.family_id == family.id).all()
        result.append({
            "id": family.id,
            "family_name": family.family_name,
            "parent_first_name": family.parent_first_name,
            "parent_last_name": family.parent_last_name,
            "email": family.email,
            "dismissal_method": family.dismissal_method,
            "students": [
                {
                    "id": s.id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "grade": s.grade,
                    "teacher": s.teacher,
                    "choice1": s.choice1,
                    "choice2": s.choice2,
                    "choice3": s.choice3,
                    "assigned_club": None,
                    "waitlisted_clubs": [],
                }
                for s in students
            ]
        })

    return result


@router.post("/run")
def run_lottery(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Run the lottery engine:
    1. Clear any existing assignments
    2. Randomize family order
    3. Process each family using sibling-aware round-based assignment
    4. Build waitlists for unassigned students
    """
    # Clear existing assignments and waitlists
    db.query(Assignment).delete()
    db.query(Waitlist).delete()
    db.commit()

    # Get all clubs and families
    clubs = db.query(Club).all()
    families = db.query(Family).all()

    if not families:
        raise HTTPException(status_code=400, detail="No families found. Add families before running the lottery.")

    if not clubs:
        raise HTTPException(status_code=400, detail="No clubs found. Set up clubs before running the lottery.")

    # Randomize family order
    family_order = families.copy()
    random.shuffle(family_order)

    assigned_count = 0
    waitlisted_count = 0
    results = []

    # Process each family
    for family in family_order:
        students = db.query(Student).filter(Student.family_id == family.id).all()
        student_results = []

        # Get valid choices for each student
        for student in students:
            student.valid_choices = get_valid_choices(student, clubs)
            student.assigned_club_id = None

        # Round-based assignment — try choice 1 for all, then choice 2, then choice 3
        max_rounds = max((len(s.valid_choices) for s in students), default=0)

        for round_num in range(max_rounds):
            for student in students:
                if student.assigned_club_id is not None:
                    continue
                if round_num >= len(student.valid_choices):
                    continue

                club = student.valid_choices[round_num]

                # Check if club has space — query AFTER each commit for accuracy
                enrolled_count = db.query(Assignment).filter(
                    Assignment.club_id == club.id
                ).count()

                if enrolled_count < club.max_students:
                    # Assign student
                    from datetime import date
                    assignment = Assignment(
                        student_id=student.id,
                        club_id=club.id,
                        assigned_date=date.today().isoformat()
                    )
                    db.add(assignment)
                    db.commit()  # commit immediately so next student sees accurate count
                    student.assigned_club_id = club.id
                    assigned_count += 1

        # Waitlist unassigned students
        for student in students:
            assigned_club_name = None
            waitlisted_clubs = []

            if student.assigned_club_id:
                club = next((c for c in clubs if c.id == student.assigned_club_id), None)
                assigned_club_name = club.name if club else None
            else:
                # Add to waitlist for each valid choice
                for club in student.valid_choices:
                    position = db.query(Waitlist).filter(
                        Waitlist.club_id == club.id
                    ).count() + 1

                    waitlist_entry = Waitlist(
                        student_id=student.id,
                        club_id=club.id,
                        position=position
                    )
                    db.add(waitlist_entry)
                    waitlisted_clubs.append(club.name)

                db.commit()
                if student.valid_choices:  # only count once per student
                    waitlisted_count += 1


            student_results.append({
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "grade": student.grade,
                "assigned_club": assigned_club_name,
                "waitlisted_clubs": waitlisted_clubs,
            })

        results.append({
            "family_id": family.id,
            "family_name": family.family_name,
            "students": student_results,
        })

    return {
        "message": "Lottery completed successfully!",
        "total_assigned": assigned_count,
        "total_waitlisted": waitlisted_count,
        "family_order": [f.id for f in family_order],
        "results": results,
    }


@router.post("/send-letters")
def send_letters(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Send acceptance and waitlist notifications to all families.
    Called separately after coordinator reviews results.
    """
    families = db.query(Family).all()
    sent_count = 0

    for family in families:
        students = db.query(Student).filter(Student.family_id == family.id).all()
        has_assignment = False
        has_waitlist = False

        for student in students:
            assignment = db.query(Assignment).filter(
                Assignment.student_id == student.id
            ).first()
            if assignment:
                has_assignment = True

            waitlist = db.query(Waitlist).filter(
                Waitlist.student_id == student.id
            ).first()
            if waitlist:
                has_waitlist = True

        if has_assignment or has_waitlist:
            print(f"Sending notification to {family.email}")
            sent_count += 1

    return {
        "message": f"Notifications sent to {sent_count} families!",
        "sent_count": sent_count,
    }


@router.get("/results")
def get_results(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Returns full assignment results grouped by status.
    """
    students = db.query(Student).all()

    assigned = []
    waitlisted = []
    unassigned = []

    for student in students:
        family = db.query(Family).filter(Family.id == student.family_id).first()
        assignment = db.query(Assignment).filter(
            Assignment.student_id == student.id
        ).first()

        student_data = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "grade": student.grade,
            "teacher": student.teacher,
            "family_name": family.family_name if family else "",
            "family_email": family.email if family else "",
            "dismissal_method": family.dismissal_method if family else "",
        }

        if assignment:
            club = db.query(Club).filter(Club.id == assignment.club_id).first()
            student_data["club_name"] = club.name if club else ""
            student_data["room_number"] = club.room_number if club else ""
            student_data["dismissal_location"] = club.dismissal_location if club else ""
            assigned.append(student_data)
        else:
            waitlist_entries = db.query(Waitlist).filter(
                Waitlist.student_id == student.id
            ).all()

            if waitlist_entries:
                student_data["waitlist_entries"] = [
                    {
                        "club_name": db.query(Club).filter(Club.id == w.club_id).first().name,
                        "position": w.position
                    }
                    for w in waitlist_entries
                ]
                waitlisted.append(student_data)
            else:
                unassigned.append(student_data)

    return {
        "assigned": assigned,
        "waitlisted": waitlisted,
        "unassigned": unassigned,
        "total_assigned": len(assigned),
        "total_waitlisted": len(waitlisted),
        "total_unassigned": len(unassigned),
    }


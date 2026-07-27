from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from models.user import User
from models.club import Club
from models.student import Student
from models.family import Family
from models.assignment import Assignment
from models.waitlist import Waitlist
from datetime import date

router = APIRouter(prefix="/roster", tags=["Roster"])


@router.get("/")
def get_rosters(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Get all clubs with their full rosters and waitlists"""
    clubs = db.query(Club).all()

    result = []
    for club in clubs:
        # Get enrolled students
        assignments = db.query(Assignment).filter(
            Assignment.club_id == club.id
        ).all()

        enrolled = []
        for a in assignments:
            student = db.query(Student).filter(Student.id == a.student_id).first()
            family = db.query(Family).filter(Family.id == student.family_id).first()
            enrolled.append({
                "assignment_id": a.id,
                "student_id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "grade": student.grade,
                "teacher": student.teacher,
                "family_name": family.family_name if family else "",
                "dismissal_method": family.dismissal_method if family else "",
            })

        # Get waitlisted students
        waitlist = db.query(Waitlist).filter(
            Waitlist.club_id == club.id
        ).order_by(Waitlist.position).all()

        waitlisted = []
        for w in waitlist:
            student = db.query(Student).filter(Student.id == w.student_id).first()
            family = db.query(Family).filter(Family.id == student.family_id).first()
            waitlisted.append({
                "waitlist_id": w.id,
                "student_id": student.id,
                "position": w.position,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "grade": student.grade,
                "teacher": student.teacher,
                "family_name": family.family_name if family else "",
                "pending_confirmation": w.pending_confirmation,
            })

        result.append({
            "id": club.id,
            "name": club.name,
            "instructor": club.instructor,
            "room_number": club.room_number,
            "grade_min": club.grade_min,
            "grade_max": club.grade_max,
            "max_students": club.max_students,
            "enrolled_count": len(enrolled),
            "enrolled": enrolled,
            "waitlist": waitlisted,
        })

    return result


@router.delete("/student/{student_id}")
def remove_student(
    student_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Remove a student from their club.
    Automatically moves first waitlisted student to pending confirmation.
    """
    assignment = db.query(Assignment).filter(
        Assignment.student_id == student_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Student is not enrolled in any club")

    club_id = assignment.club_id

    # Remove the assignment
    db.delete(assignment)
    db.commit()

    # Also remove student from any waitlists they're on
    db.query(Waitlist).filter(Waitlist.student_id == student_id).delete()
    db.commit()

    # Promote first waitlisted student to pending confirmation
    next_waitlisted = db.query(Waitlist).filter(
        Waitlist.club_id == club_id,
        Waitlist.pending_confirmation == False
    ).order_by(Waitlist.position).first()

    if next_waitlisted:
        next_waitlisted.pending_confirmation = True
        db.commit()
        return {"message": "Student removed. First waitlisted student is pending confirmation."}

    return {"message": "Student removed. No waitlisted students to promote."}


@router.post("/confirm/{waitlist_id}")
def confirm_promotion(
    waitlist_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Confirm a pending waitlist promotion.
    Moves student from waitlist to enrolled.
    """
    waitlist_entry = db.query(Waitlist).filter(
        Waitlist.id == waitlist_id,
        Waitlist.pending_confirmation == True
    ).first()

    if not waitlist_entry:
        raise HTTPException(status_code=404, detail="No pending confirmation found")

    # Create assignment
    new_assignment = Assignment(
        student_id=waitlist_entry.student_id,
        club_id=waitlist_entry.club_id,
        assigned_date=date.today().isoformat()
    )
    db.add(new_assignment)

    # Remove from waitlist
    db.delete(waitlist_entry)
    db.commit()

    # Reorder remaining waitlist positions
    remaining = db.query(Waitlist).filter(
        Waitlist.club_id == new_assignment.club_id
    ).order_by(Waitlist.position).all()

    for i, entry in enumerate(remaining):
        entry.position = i + 1
    db.commit()

    return {"message": "Student confirmed and added to roster!"}


@router.delete("/confirm/{waitlist_id}")
def deny_promotion(
    waitlist_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Deny a pending waitlist promotion.
    Moves to next student on waitlist.
    """
    waitlist_entry = db.query(Waitlist).filter(
        Waitlist.id == waitlist_id,
        Waitlist.pending_confirmation == True
    ).first()

    if not waitlist_entry:
        raise HTTPException(status_code=404, detail="No pending confirmation found")

    club_id = waitlist_entry.club_id

    # Remove this entry
    db.delete(waitlist_entry)
    db.commit()

    # Promote next student to pending
    next_waitlisted = db.query(Waitlist).filter(
        Waitlist.club_id == club_id,
        Waitlist.pending_confirmation == False
    ).order_by(Waitlist.position).first()

    if next_waitlisted:
        next_waitlisted.pending_confirmation = True
        db.commit()
        return {"message": "Promotion denied. Next waitlisted student is now pending confirmation."}

    return {"message": "Promotion denied. No more waitlisted students."}
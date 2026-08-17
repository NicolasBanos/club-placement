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
from models.parent_family import ParentFamily
from models.authorized_pickup import AuthorizedPickup
from models.parent_family import ParentFamily


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
        assignments = db.query(Assignment).filter(
            Assignment.club_id == club.id
        ).all()

        enrolled = []
        for a in assignments:
            student = db.query(Student).filter(Student.id == a.student_id).first()
            family = db.query(Family).filter(Family.id == student.family_id).first()

            pickups = []
            linked_parents = []
            if family:
                for p in db.query(AuthorizedPickup).filter(AuthorizedPickup.family_id == family.id).all():
                    pickups.append({
                        "id": p.id,
                        "name": p.name,
                        "phone": p.phone,
                        "relationship_to_student": p.relationship_to_student,
                    })
                links = db.query(ParentFamily).filter(ParentFamily.family_id == family.id).all()
                for link in links:
                    parent_user = db.query(User).filter(User.id == link.parent_id).first()
                    if parent_user:
                        linked_parents.append({
                            "id": parent_user.id,
                            "name": f"{parent_user.first_name} {parent_user.last_name}",
                            "email": parent_user.email,
                            "role": link.role,
                        })

            enrolled.append({
                "assignment_id": a.id,
                "student_id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "grade": student.grade,
                "teacher": student.teacher,
                "family_name": family.family_name if family else "",
                "dismissal_method": family.dismissal_method if family else "",
                "pickups": pickups,
                "primary_contact": {
                    "name": f"{family.parent_first_name} {family.parent_last_name}" if family else "",
                    "phone": family.phone if family else "",
                    "phone2": family.phone2 if family else None,
                    "phone2_owner": family.phone2_owner if family else None,
                    "email": family.email if family else "",
                } if family else None,
                "linked_parents": linked_parents,
            })

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
    Removes student from all other waitlists.
    """
    waitlist_entry = db.query(Waitlist).filter(
        Waitlist.id == waitlist_id,
        Waitlist.pending_confirmation == True
    ).first()

    if not waitlist_entry:
        raise HTTPException(status_code=404, detail="No pending confirmation found")

    student_id = waitlist_entry.student_id
    club_id = waitlist_entry.club_id

    # Create assignment
    new_assignment = Assignment(
        student_id=student_id,
        club_id=club_id,
        assigned_date=date.today().isoformat()
    )
    db.add(new_assignment)

    # Remove student from ALL waitlists
    db.query(Waitlist).filter(
        Waitlist.student_id == student_id
    ).delete()
    db.commit()

    # Reorder remaining waitlist positions for this club
    remaining = db.query(Waitlist).filter(
        Waitlist.club_id == club_id
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


@router.post("/promote/{waitlist_id}")
def promote_student_directly(
    waitlist_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Directly promote a waitlisted student to fill an available spot.
    Only works if the club has open spots available.
    Removes student from all other waitlists.
    """
    waitlist_entry = db.query(Waitlist).filter(
        Waitlist.id == waitlist_id
    ).first()

    if not waitlist_entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    club = db.query(Club).filter(Club.id == waitlist_entry.club_id).first()
    student_id = waitlist_entry.student_id

    # Check if spot is available
    enrolled_count = db.query(Assignment).filter(
        Assignment.club_id == club.id
    ).count()

    if enrolled_count >= club.max_students:
        raise HTTPException(
            status_code=400,
            detail=f"{club.name} is full. Remove a student first to open a spot."
        )

    # Create assignment
    new_assignment = Assignment(
        student_id=student_id,
        club_id=waitlist_entry.club_id,
        assigned_date=date.today().isoformat()
    )
    db.add(new_assignment)

    # Remove student from ALL waitlists
    db.query(Waitlist).filter(
        Waitlist.student_id == student_id
    ).delete()
    db.commit()

    # Reorder remaining waitlist positions for this club
    remaining = db.query(Waitlist).filter(
        Waitlist.club_id == club.id
    ).order_by(Waitlist.position).all()

    for i, entry in enumerate(remaining):
        entry.position = i + 1
    db.commit()

    student = db.query(Student).filter(Student.id == student_id).first()

    return {
        "message": f"{student.first_name} {student.last_name} promoted to {club.name}!"
    }


@router.put("/waitlist/reorder/{waitlist_id}")
def reorder_waitlist(
    waitlist_id: int,
    new_position: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Change a student's position on the waitlist."""
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    club_id = entry.club_id
    old_position = entry.position

    all_entries = db.query(Waitlist).filter(
        Waitlist.club_id == club_id
    ).order_by(Waitlist.position).all()

    new_position = max(1, min(new_position, len(all_entries)))

    if new_position == old_position:
        return {"message": "Position unchanged"}

    all_entries.pop(old_position - 1)
    all_entries.insert(new_position - 1, entry)

    for i, e in enumerate(all_entries):
        e.position = i + 1

    db.commit()
    return {"message": f"Moved to position {new_position}"}


@router.delete("/waitlist/{waitlist_id}")
def remove_from_waitlist(
    waitlist_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Remove a student from a waitlist entirely"""
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    club_id = entry.club_id
    db.delete(entry)
    db.commit()

    # Reorder remaining positions
    remaining = db.query(Waitlist).filter(
        Waitlist.club_id == club_id
    ).order_by(Waitlist.position).all()

    for i, e in enumerate(remaining):
        e.position = i + 1
    db.commit()

    return {"message": "Student removed from waitlist"}

@router.post("/assign/{student_id}")
def manually_assign_student(
    student_id: int,
    club_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Manually assign an unassigned student to a club.
    Only works if the club has open spots.
    """
    # Check student isn't already assigned
    existing = db.query(Assignment).filter(
        Assignment.student_id == student_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Student is already assigned to a club")

    # Check club has space
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    enrolled_count = db.query(Assignment).filter(
        Assignment.club_id == club_id
    ).count()

    if enrolled_count >= club.max_students:
        raise HTTPException(
            status_code=400,
            detail=f"{club.name} is full"
        )

    # Check grade eligibility
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not (club.grade_min <= student.grade <= club.grade_max):
        raise HTTPException(
            status_code=400,
            detail=f"{student.first_name} is not eligible for {club.name} (grade mismatch)"
        )

    # Create assignment
    new_assignment = Assignment(
        student_id=student_id,
        club_id=club_id,
        assigned_date=date.today().isoformat()
    )
    db.add(new_assignment)

    # Remove from any waitlists
    db.query(Waitlist).filter(
        Waitlist.student_id == student_id
    ).delete()

    db.commit()

    return {
        "message": f"{student.first_name} {student.last_name} assigned to {club.name}!"
    }


@router.delete("/students/{student_id}/parent/{parent_user_id}")
def unlink_parent_from_student(
    student_id: int,
    parent_user_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Coordinator removes a parent's access to a specific student's family
    (e.g. restraining order, custody change). Unlinks the ParentFamily
    connection — does not delete the parent's login account itself.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    link = db.query(ParentFamily).filter(
        ParentFamily.parent_id == parent_user_id,
        ParentFamily.family_id == student.family_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="This parent is not linked to this student's family")

    db.delete(link)
    db.commit()
    return {"message": "Parent access removed from this family."}

@router.delete("/pickups/{pickup_id}")
def remove_pickup_as_coordinator(
    pickup_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Coordinator removes an authorized pickup person from any family."""
    pickup = db.query(AuthorizedPickup).filter(AuthorizedPickup.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    db.delete(pickup)
    db.commit()
    return {"message": "Pickup removed."}
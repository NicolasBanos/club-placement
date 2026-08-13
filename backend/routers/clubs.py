from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database.connection import get_db
from core.auth import require_coordinator
from models.club import Club
from models.meeting_date import MeetingDate
from models.user import User
from core.auth import require_coordinator, require_teacher
from models.student import Student
from models.family import Family
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.authorized_pickup import AuthorizedPickup
from models.parent_family import ParentFamily


router = APIRouter(prefix="/clubs", tags=["Clubs"])


# --- Schemas ---

class MeetingDateSchema(BaseModel):
    date: str
    start_time: str
    end_time: str


class ClubCreate(BaseModel):
    name: str
    instructor: str
    grade_min: int
    grade_max: int
    max_students: int
    room_number: str
    dismissal_location: str
    description: Optional[str] = None
    meeting_dates: List[MeetingDateSchema] = []


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    instructor: Optional[str] = None
    grade_min: Optional[int] = None
    grade_max: Optional[int] = None
    max_students: Optional[int] = None
    room_number: Optional[str] = None
    dismissal_location: Optional[str] = None
    description: Optional[str] = None
    meeting_dates: Optional[List[MeetingDateSchema]] = None


# --- Endpoints ---

@router.get("/")
def get_all_clubs(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Get all clubs with enrollment data"""
    clubs = db.query(Club).all()
    return [
        {
            "id": club.id,
            "name": club.name,
            "instructor": club.instructor,
            "grade_min": club.grade_min,
            "grade_max": club.grade_max,
            "max_students": club.max_students,
            "room_number": club.room_number,
            "dismissal_location": club.dismissal_location,
            "description": club.description,
            "enrolled": len(club.assignments),
            "waitlisted": len(club.waitlist_entries),
            "meeting_dates": [
                {
                    "id": m.id,
                    "date": m.date,
                    "start_time": m.start_time,
                    "end_time": m.end_time
                }
                for m in club.meeting_dates
            ]
        }
        for club in clubs
    ]

@router.get("/public")
def get_public_clubs(db: Session = Depends(get_db)):
    """
    Public, unauthenticated list of clubs for the registration form.
    Returns only non-sensitive info (name + grade range) so parents can
    pick grade-eligible club choices before they have an account.
    """
    clubs = db.query(Club).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "grade_min": c.grade_min,
            "grade_max": c.grade_max,
        }
        for c in clubs
    ]

@router.get("/mine")
def get_my_club(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Returns the club(s) assigned to the logged-in teacher, with enrollment
    and next-meeting info. A teacher currently has at most one club.
    """
    clubs = db.query(Club).filter(Club.teacher_id == current_user.id).all()

    if not clubs:
        return []

    from datetime import date
    today = date.today().isoformat()

    result = []
    for club in clubs:
        upcoming = sorted(
            [m for m in club.meeting_dates if m.date >= today],
            key=lambda m: m.date
        )
        next_meeting = upcoming[0] if upcoming else None

        result.append({
            "id": club.id,
            "name": club.name,
            "grade_min": club.grade_min,
            "grade_max": club.grade_max,
            "max_students": club.max_students,
            "room_number": club.room_number,
            "dismissal_location": club.dismissal_location,
            "description": club.description,
            "enrolled": len(club.assignments),
            "waitlisted": len(club.waitlist_entries),
            "next_meeting": {
                "id": next_meeting.id,
                "date": next_meeting.date,
                "start_time": next_meeting.start_time,
                "end_time": next_meeting.end_time,
            } if next_meeting else None,
        })

    return result

@router.get("/{club_id}/roster")
def get_club_roster(
    club_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Full roster (enrolled + waitlist) for a single club.
    Teachers can only view their own assigned club; coordinators can view any club.
    """
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if current_user.role.value == "teacher" and club.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this club")

    assignments = db.query(Assignment).filter(Assignment.club_id == club.id).all()
    
    enrolled = []
    for a in assignments:
        student = db.query(Student).filter(Student.id == a.student_id).first()
        family = db.query(Family).filter(Family.id == student.family_id).first() if student else None

        pickups = []
        if family:
            for p in db.query(AuthorizedPickup).filter(AuthorizedPickup.family_id == family.id).all():
                pickups.append({
                    "name": p.name,
                    "phone": p.phone,
                    "relationship_to_student": p.relationship_to_student,
                })

        linked_parents = []
        if family:
            links = db.query(ParentFamily).filter(ParentFamily.family_id == family.id).all()
            for link in links:
                parent_user = db.query(User).filter(User.id == link.parent_id).first()
                if parent_user:
                    linked_parents.append({
                        "name": f"{parent_user.first_name} {parent_user.last_name}",
                        "email": parent_user.email,
                        "role": link.role,
                    })

        enrolled.append({
            "student_id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "grade": student.grade,
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
    enrolled.sort(key=lambda s: (s["last_name"], s["first_name"]))

    waitlist = db.query(Waitlist).filter(Waitlist.club_id == club.id).order_by(Waitlist.position).all()
    waitlisted = []
    for w in waitlist:
        student = db.query(Student).filter(Student.id == w.student_id).first()
        family = db.query(Family).filter(Family.id == student.family_id).first() if student else None
        waitlisted.append({
            "student_id": student.id,
            "position": w.position,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "grade": student.grade,
            "family_name": family.family_name if family else "",
            "pending_confirmation": w.pending_confirmation,
        })

    return {
        "id": club.id,
        "name": club.name,
        "room_number": club.room_number,
        "max_students": club.max_students,
        "enrolled_count": len(enrolled),
        "enrolled": enrolled,
        "waitlist": waitlisted,
    }

@router.post("/")
def create_club(
    club_data: ClubCreate,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Create a new club"""
    new_club = Club(
        name=club_data.name,
        instructor=club_data.instructor,
        grade_min=club_data.grade_min,
        grade_max=club_data.grade_max,
        max_students=club_data.max_students,
        room_number=club_data.room_number,
        dismissal_location=club_data.dismissal_location,
        description=club_data.description,
        school_id=current_user.school_id,
    )
    db.add(new_club)
    db.commit()
    db.refresh(new_club)

    # Add meeting dates
    for meeting in club_data.meeting_dates:
        new_meeting = MeetingDate(
            club_id=new_club.id,
            date=meeting.date,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
        )
        db.add(new_meeting)

    db.commit()

    return {"message": f"Club '{new_club.name}' created successfully!", "id": new_club.id}


@router.put("/{club_id}")
def update_club(
    club_id: int,
    club_data: ClubUpdate,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Update an existing club"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Update fields
    if club_data.name is not None: club.name = club_data.name
    if club_data.instructor is not None: club.instructor = club_data.instructor
    if club_data.grade_min is not None: club.grade_min = club_data.grade_min
    if club_data.grade_max is not None: club.grade_max = club_data.grade_max
    if club_data.max_students is not None: club.max_students = club_data.max_students
    if club_data.room_number is not None: club.room_number = club_data.room_number
    if club_data.dismissal_location is not None: club.dismissal_location = club_data.dismissal_location
    if club_data.description is not None: club.description = club_data.description

    # Update meeting dates if provided
    if club_data.meeting_dates is not None:
        # Delete old dates
        db.query(MeetingDate).filter(MeetingDate.club_id == club_id).delete()
        # Add new dates
        for meeting in club_data.meeting_dates:
            new_meeting = MeetingDate(
                club_id=club_id,
                date=meeting.date,
                start_time=meeting.start_time,
                end_time=meeting.end_time,
            )
            db.add(new_meeting)

    db.commit()
    return {"message": f"Club '{club.name}' updated successfully!"}


@router.delete("/{club_id}")
def delete_club(
    club_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Delete a club"""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Delete meeting dates first
    db.query(MeetingDate).filter(MeetingDate.club_id == club_id).delete()
    db.delete(club)
    db.commit()

    return {"message": f"Club deleted successfully!"}
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database.connection import get_db
from core.auth import require_coordinator
from models.club import Club
from models.meeting_date import MeetingDate
from models.user import User

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
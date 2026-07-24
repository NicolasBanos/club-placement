from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from models.user import User
from models.club import Club
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Returns live stats for the coordinator dashboard.
    """
    # Total assigned students
    total_enrolled = db.query(Assignment).count()

    # Total waitlisted students
    total_waitlisted = db.query(Waitlist).count()

    # Total clubs
    total_clubs = db.query(Club).count()

    return {
        "total_enrolled": total_enrolled,
        "total_waitlisted": total_waitlisted,
        "total_clubs": total_clubs,
        "pending_excuses": 0,
        "unread_messages": 0,
    }


@router.get("/clubs")
def get_clubs(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Returns all clubs with enrollment data.
    """
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
            "enrolled": len(club.assignments),
            "waitlisted": len(club.waitlist_entries),
            "meeting_dates": [
                {
                    "date": m.date,
                    "start_time": m.start_time,
                    "end_time": m.end_time
                }
                for m in club.meeting_dates
            ]
        }
        for club in clubs
    ]


@router.get("/next-meeting")
def get_next_meeting(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Returns the next upcoming meeting date across all clubs.
    """
    from datetime import date
    today = date.today().isoformat()

    next_meeting = db.query(MeetingDate)\
        .filter(MeetingDate.date >= today)\
        .order_by(MeetingDate.date)\
        .first()

    if next_meeting:
        return {
            "date": next_meeting.date,
            "start_time": next_meeting.start_time,
            "end_time": next_meeting.end_time,
        }
    return {"date": None, "start_time": None, "end_time": None}
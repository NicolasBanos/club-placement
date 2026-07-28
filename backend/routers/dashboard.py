from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator
from models.user import User
from models.club import Club
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate
from models.student import Student

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Returns live stats for the coordinator dashboard.
    """
    total_enrolled = db.query(Assignment).count()
    total_waitlisted = db.query(Waitlist).count()
    total_clubs = db.query(Club).count()
    total_students = db.query(Student).count()

    # Unassigned = students with no assignment AND not on any waitlist
    assigned_ids = {a.student_id for a in db.query(Assignment.student_id).all()}
    waitlisted_ids = {w.student_id for w in db.query(Waitlist.student_id).all()}
    placed_ids = assigned_ids | waitlisted_ids
    total_unassigned = db.query(Student).filter(~Student.id.in_(placed_ids)).count() if placed_ids else total_students

    # Clubs at capacity
    clubs = db.query(Club).all()
    clubs_at_capacity = sum(1 for c in clubs if len(c.assignments) >= c.max_students)

    return {
        "total_enrolled": total_enrolled,
        "total_waitlisted": total_waitlisted,
        "total_clubs": total_clubs,
        "total_students": total_students,
        "total_unassigned": total_unassigned,
        "clubs_at_capacity": clubs_at_capacity,
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
    Returns all clubs meeting on the next upcoming date.
    """
    from datetime import date
    today = date.today().isoformat()

    next_meeting = db.query(MeetingDate)\
        .filter(MeetingDate.date >= today)\
        .order_by(MeetingDate.date)\
        .first()

    if not next_meeting:
        return {"date": None, "meetings": []}

    all_meetings = db.query(MeetingDate)\
        .filter(MeetingDate.date == next_meeting.date)\
        .all()

    meetings = []
    for m in all_meetings:
        club = db.query(Club).filter(Club.id == m.club_id).first()
        if club:
            meetings.append({
                "club_name": club.name,
                "room_number": club.room_number,
                "start_time": m.start_time,
                "end_time": m.end_time,
            })

    return {
        "date": next_meeting.date,
        "meetings": meetings
    }
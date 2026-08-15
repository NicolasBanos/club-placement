from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator, get_current_user
from models.user import User
from models.club import Club
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate
from models.student import Student
from models.school import School
from pydantic import BaseModel
from models.attendance import Attendance
from models.message_thread import MessageThread
from models.thread_participant import ThreadParticipant
from models.message import Message


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

    pending_excuses = db.query(Attendance).filter(Attendance.excuse_status == "pending").count()

    my_thread_ids = [
        tp.thread_id for tp in
        db.query(ThreadParticipant).filter(ThreadParticipant.user_id == current_user.id).all()
    ]
    unread_messages = 0
    for thread_id in my_thread_ids:
        last_message = db.query(Message).filter(
            Message.thread_id == thread_id
        ).order_by(Message.sent_at.desc()).first()
        if not last_message or last_message.sender_id == current_user.id:
            continue
        my_row = db.query(ThreadParticipant).filter(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == current_user.id
        ).first()
        if not my_row.last_read_at or last_message.sent_at > my_row.last_read_at:
            unread_messages += 1

    return {
        "total_enrolled": total_enrolled,
        "total_waitlisted": total_waitlisted,
        "total_clubs": total_clubs,
        "total_students": total_students,
        "total_unassigned": total_unassigned,
        "clubs_at_capacity": clubs_at_capacity,
        "pending_excuses": pending_excuses,
        "unread_messages": unread_messages,
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

class LockUpdate(BaseModel):
    locked: bool


@router.get("/lock-status")
def get_lock_status(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Returns whether registration (new children + club choices) is currently locked."""
    school = db.query(School).filter(School.id == current_user.school_id).first()
    return {"registration_locked": school.registration_locked if school else False}


@router.put("/lock-status")
def set_lock_status(
    update: LockUpdate,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Locks or unlocks registration for the coordinator's school."""
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.registration_locked = update.locked
    db.commit()
    return {"message": f"Registration {'locked' if update.locked else 'unlocked'}.", "registration_locked": school.registration_locked}

@router.get("/lock-status/public")
def get_lock_status_public(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Any logged-in user can check whether registration is locked."""
    school = db.query(School).filter(School.id == current_user.school_id).first()
    return {"registration_locked": school.registration_locked if school else False}
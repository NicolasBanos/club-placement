from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, date
from database.connection import get_db
from core.auth import require_coordinator, require_teacher, require_parent
from core.notifications import send_excuse_decision_notification
from models.user import User
from models.club import Club
from models.student import Student
from models.family import Family
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate
from models.attendance import Attendance
from models.parent_family import ParentFamily

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ---------- Request schemas ----------

class StudentAttendance(BaseModel):
    student_id: int
    status: str            # "present" | "absent"
    late_pickup: bool = False


class AttendanceSubmission(BaseModel):
    meeting_date_id: int
    records: list[StudentAttendance]

class ExcuseSubmission(BaseModel):
    attendance_id: int
    excuse_reason: str    


# ---------- Helpers ----------

def _is_first_day(db: Session, club_id: int, meeting_date_id: int) -> bool:
    """True if the given meeting date is the earliest one for its club."""
    earliest = db.query(MeetingDate).filter(
        MeetingDate.club_id == club_id
    ).order_by(MeetingDate.date).first()
    return earliest is not None and earliest.id == meeting_date_id


def _notify_family_guarded(db: Session, student_id: int, approved: bool, club_name: str):
    """
    Attempt to notify the family of an excuse decision.
    Guarded: if no linked parent / device token exists yet, skip silently.
    (Parent-family linking is a separate issue; this starts working once it lands.)
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return
    family = db.query(Family).filter(Family.id == student.family_id).first()
    if not family:
        return
    # No reliable parent<->family link yet, so match a parent user by email.
    parent = db.query(User).filter(User.email == family.email).first()
    if not parent or not parent.device_token:
        print(f"ℹ️ No device token for family of student {student_id}; skipping notification.")
        return
    student_name = f"{student.first_name} {student.last_name}"
    send_excuse_decision_notification(
        device_token=parent.device_token,
        student_name=student_name,
        approved=approved,
        club_name=club_name,
    )


# ---------- Teacher: submit attendance ----------

@router.post("/submit")
def submit_attendance(
    submission: AttendanceSubmission,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Submit attendance for a whole roster for one meeting date.
    Upserts a record per student. Absences are recorded with excuse_status 'none';
    a parent later submits an excuse to move it into the coordinator queue.
    """
    meeting = db.query(MeetingDate).filter(
        MeetingDate.id == submission.meeting_date_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting date not found")

    for record in submission.records:
        if record.status not in ("present", "absent"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{record.status}' for student {record.student_id}"
            )

        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.meeting_date_id == submission.meeting_date_id
        ).first()

        if existing:
            existing.status = record.status
            existing.late_pickup = record.late_pickup
        else:
            db.add(Attendance(
                student_id=record.student_id,
                meeting_date_id=submission.meeting_date_id,
                status=record.status,
                late_pickup=record.late_pickup,
                excuse_status="none",
            ))

    db.commit()
    return {"message": "Attendance submitted successfully."}


# ---------- Coordinator: list pending excuses ----------

@router.get("/excuses/pending")
def list_pending_excuses(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """All absences with a pending excuse, for the coordinator approval queue."""
    pending = db.query(Attendance).filter(
        Attendance.excuse_status == "pending"
    ).all()

    result = []
    for a in pending:
        student = db.query(Student).filter(Student.id == a.student_id).first()
        meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
        club = db.query(Club).filter(Club.id == meeting.club_id).first() if meeting else None

        result.append({
            "attendance_id": a.id,
            "student_id": a.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "",
            "grade": student.grade if student else None,
            "club_id": club.id if club else None,
            "club_name": club.name if club else "",
            "absence_date": meeting.date if meeting else "",
            "is_first_day": _is_first_day(db, club.id, a.meeting_date_id) if club else False,
            "excuse_reason": a.excuse_reason,
            "submitted_at": a.submitted_at,
        })

    return result


# ---------- Coordinator: approve an excuse ----------

@router.post("/excuses/{attendance_id}/approve")
def approve_excuse(
    attendance_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Approve a pending excuse. Student stays enrolled; absence marked excused."""
    a = db.query(Attendance).filter(
        Attendance.id == attendance_id,
        Attendance.excuse_status == "pending"
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="No pending excuse found")

    a.excuse_status = "approved"
    a.reviewed_at = datetime.utcnow().isoformat()
    a.reviewed_by = current_user.id
    db.commit()

    meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
    club = db.query(Club).filter(Club.id == meeting.club_id).first() if meeting else None
    _notify_family_guarded(db, a.student_id, approved=True, club_name=club.name if club else "")

    return {"message": "Excuse approved. Student remains enrolled."}


# ---------- Coordinator: deny an excuse ----------

@router.post("/excuses/{attendance_id}/deny")
def deny_excuse(
    attendance_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Deny a pending excuse.
    First-day absence -> withdraw student, promote first waitlisted to pending confirmation.
    Regular absence   -> just record as denied (unexcused; counts toward two-strike rule).
    """
    a = db.query(Attendance).filter(
        Attendance.id == attendance_id,
        Attendance.excuse_status == "pending"
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="No pending excuse found")

    meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
    club = db.query(Club).filter(Club.id == meeting.club_id).first() if meeting else None

    a.excuse_status = "denied"
    a.reviewed_at = datetime.utcnow().isoformat()
    a.reviewed_by = current_user.id
    db.commit()

    withdrawn = False
    if club and _is_first_day(db, club.id, a.meeting_date_id):
        assignment = db.query(Assignment).filter(
            Assignment.student_id == a.student_id,
            Assignment.club_id == club.id
        ).first()
        if assignment:
            db.delete(assignment)
            db.commit()
            withdrawn = True

            # Promote first waitlisted student to pending confirmation (same as roster flow)
            next_waitlisted = db.query(Waitlist).filter(
                Waitlist.club_id == club.id,
                Waitlist.pending_confirmation == False
            ).order_by(Waitlist.position).first()
            if next_waitlisted:
                next_waitlisted.pending_confirmation = True
                db.commit()

    _notify_family_guarded(db, a.student_id, approved=False, club_name=club.name if club else "")

    if withdrawn:
        return {"message": "Excuse denied. First-day absence: student withdrawn and first waitlisted student promoted to pending confirmation."}
    return {"message": "Excuse denied and recorded as an unexcused absence."}


# ---------- Coordinator: excuse history ----------

@router.get("/excuses/history")
def excuse_history(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Past approved and denied excuses."""
    reviewed = db.query(Attendance).filter(
        Attendance.excuse_status.in_(["approved", "denied"])
    ).all()

    result = []
    for a in reviewed:
        student = db.query(Student).filter(Student.id == a.student_id).first()
        meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
        club = db.query(Club).filter(Club.id == meeting.club_id).first() if meeting else None

        result.append({
            "attendance_id": a.id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "",
            "club_name": club.name if club else "",
            "absence_date": meeting.date if meeting else "",
            "excuse_reason": a.excuse_reason,
            "excuse_status": a.excuse_status,
            "reviewed_at": a.reviewed_at,
        })

    return result

# ---------- Coordinator: list all distinct meeting dates (for dropdown) ----------

@router.get("/dates")
def list_meeting_dates(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Distinct calendar dates across all clubs, newest first, for the overview dropdown."""
    rows = db.query(MeetingDate.date).distinct().all()
    dates = sorted({r[0] for r in rows}, reverse=True)
    return dates


# ---------- Coordinator: attendance overview for a date ----------

@router.get("/overview")
def attendance_overview(
    date: str,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    For a given calendar date, show every club meeting that date with its full
    enrolled roster and each student's attendance status:
      present | absent | excused | unmarked
    Also includes each student's total unexcused absences across all dates,
    so the frontend can flag students with 2+ in red.
    """
    # All meeting-date rows on this calendar date (one per club that meets that day)
    meetings = db.query(MeetingDate).filter(MeetingDate.date == date).all()
    if not meetings:
        return []

    result = []
    for meeting in meetings:
        club = db.query(Club).filter(Club.id == meeting.club_id).first()
        if not club:
            continue

        # Enrolled students = those with an assignment to this club
        assignments = db.query(Assignment).filter(
            Assignment.club_id == club.id
        ).all()

        students_out = []
        for a in assignments:
            student = db.query(Student).filter(Student.id == a.student_id).first()
            if not student:
                continue

            record = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.meeting_date_id == meeting.id
            ).first()

            if record is None:
                display_status = "unmarked"
            elif record.status == "present":
                display_status = "present"
            elif record.status == "absent" and record.excuse_status == "approved":
                display_status = "excused"
            else:
                display_status = "absent"

            # Total unexcused absences across ALL dates for this student
            unexcused = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.status == "absent",
                Attendance.excuse_status != "approved"
            ).count()

            students_out.append({
                "student_id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "grade": student.grade,
                "teacher": student.teacher,
                "status": display_status,
                "late_pickup": record.late_pickup if record else False,
                "unexcused_absences": unexcused,
            })

        students_out.sort(key=lambda s: (s["last_name"], s["first_name"]))

        result.append({
            "club_id": club.id,
            "club_name": club.name,
            "instructor": club.instructor,
            "room_number": club.room_number,
            "meeting_date_id": meeting.id,
            "students": students_out,
        })

    return result


# ---------- Coordinator: override a student's attendance status ----------

class AttendanceOverride(BaseModel):
    student_id: int
    meeting_date_id: int
    status: str            # "present" | "absent" | "excused"


@router.put("/override")
def override_attendance(
    override: AttendanceOverride,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """
    Coordinator manually sets a student's attendance status for a meeting date.
    Overrides whatever a teacher submitted. Upserts the record.
      present -> status present, excuse cleared
      absent  -> status absent, excuse_status none (unexcused)
      excused -> status absent, excuse_status approved (coordinator-approved)
    """
    if override.status not in ("present", "absent", "excused"):
        raise HTTPException(status_code=400, detail=f"Invalid status '{override.status}'")

    meeting = db.query(MeetingDate).filter(
        MeetingDate.id == override.meeting_date_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting date not found")

    record = db.query(Attendance).filter(
        Attendance.student_id == override.student_id,
        Attendance.meeting_date_id == override.meeting_date_id
    ).first()

    if record is None:
        record = Attendance(
            student_id=override.student_id,
            meeting_date_id=override.meeting_date_id,
            status="present",
            late_pickup=False,
            excuse_status="none",
        )
        db.add(record)

    if override.status == "present":
        record.status = "present"
        record.excuse_status = "none"
        record.excuse_reason = None
        record.reviewed_at = None
        record.reviewed_by = None
    elif override.status == "absent":
        record.status = "absent"
        record.excuse_status = "none"
        record.reviewed_at = None
        record.reviewed_by = None
    else:  # excused
        record.status = "absent"
        record.excuse_status = "approved"
        record.reviewed_at = datetime.utcnow().isoformat()
        record.reviewed_by = current_user.id

    db.commit()
    return {"message": "Attendance updated."}

# ---------- Parent: list absences needing/awaiting/reviewed excuses ----------

@router.get("/excuses/mine")
def my_excuses(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """
    All absences for this parent's children, across every status:
    needs excuse (none, within deadline), needs excuse (none, past deadline),
    pending review, approved, denied.
    """
    family_ids = [
        link.family_id for link in
        db.query(ParentFamily).filter(ParentFamily.parent_id == current_user.id).all()
    ]
    if not family_ids:
        return []

    student_ids = [
        s.id for s in
        db.query(Student).filter(Student.family_id.in_(family_ids)).all()
    ]
    if not student_ids:
        return []

    absences = db.query(Attendance).filter(
        Attendance.student_id.in_(student_ids),
        Attendance.status == "absent"
    ).all()

    today = date.today()
    result = []
    for a in absences:
        student = db.query(Student).filter(Student.id == a.student_id).first()
        meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
        club = db.query(Club).filter(Club.id == meeting.club_id).first() if meeting else None

        deadline_passed = False
        days_remaining = None
        if meeting:
            meeting_date = datetime.strptime(meeting.date, "%Y-%m-%d").date()
            days_since = (today - meeting_date).days
            deadline_passed = days_since > 3
            days_remaining = max(0, 3 - days_since)

        result.append({
            "attendance_id": a.id,
            "student_id": a.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "",
            "grade": student.grade if student else None,
            "club_name": club.name if club else "",
            "absence_date": meeting.date if meeting else "",
            "excuse_status": a.excuse_status,
            "excuse_reason": a.excuse_reason,
            "submitted_at": a.submitted_at,
            "reviewed_at": a.reviewed_at,
            "deadline_passed": deadline_passed,
            "days_remaining": days_remaining,
        })

    result.sort(key=lambda r: r["absence_date"], reverse=True)
    return result


# ---------- Parent: submit an excuse ----------

@router.post("/excuses/submit")
def submit_excuse(
    submission: ExcuseSubmission,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent submits an excuse reason for one of their child's unexcused absences."""
    a = db.query(Attendance).filter(Attendance.id == submission.attendance_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Verify this student belongs to one of the parent's families
    student = db.query(Student).filter(Student.id == a.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    family_ids = [
        link.family_id for link in
        db.query(ParentFamily).filter(ParentFamily.parent_id == current_user.id).all()
    ]
    if student.family_id not in family_ids:
        raise HTTPException(status_code=403, detail="This student is not linked to your account")

    if a.status != "absent" or a.excuse_status != "none":
        raise HTTPException(
            status_code=400,
            detail="This absence has already been excused, submitted, or is not an unexcused absence"
        )

    meeting = db.query(MeetingDate).filter(MeetingDate.id == a.meeting_date_id).first()
    if meeting:
        meeting_date = datetime.strptime(meeting.date, "%Y-%m-%d").date()
        days_since = (date.today() - meeting_date).days
        if days_since > 3:
            raise HTTPException(
                status_code=400,
                detail="The 3-day window to submit this excuse has passed. Please contact your child's teacher."
            )

    if not submission.excuse_reason.strip():
        raise HTTPException(status_code=400, detail="Excuse reason cannot be empty")

    a.excuse_reason = submission.excuse_reason.strip()
    a.excuse_status = "pending"
    a.submitted_at = datetime.utcnow().isoformat()
    db.commit()

    return {"message": "Excuse submitted and sent to the coordinator for review."}
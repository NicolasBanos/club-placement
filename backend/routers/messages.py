from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database.connection import get_db
from core.auth import get_current_user
from models.user import User
from models.message_thread import MessageThread
from models.thread_participant import ThreadParticipant
from models.message import Message
from models.club import Club
from models.student import Student
from models.family import Family
from models.parent_family import ParentFamily
from models.assignment import Assignment

router = APIRouter(prefix="/messages", tags=["Messages"])


# ---------- Schemas ----------

class StartThreadRequest(BaseModel):
    recipient_id: int
    body: str


class SendMessageRequest(BaseModel):
    body: str


class AnnouncementRequest(BaseModel):
    audience_type: str   # "club_parents" | "all_families" | "teacher" | "all_teachers" | "my_class"
    club_id: Optional[int] = None      # required for "club_parents"
    teacher_id: Optional[int] = None   # required for "teacher"
    subject: str
    body: str    

class ThreadWithRequest(BaseModel):
    recipient_id: int    


# ---------- Helpers ----------

def _get_or_create_1on1_thread(db: Session, user_a_id: int, user_b_id: int) -> MessageThread:
    """
    Finds an existing non-announcement thread with exactly these two participants,
    or creates a new one.
    """
    # Find threads user_a is part of
    a_thread_ids = {
        tp.thread_id for tp in
        db.query(ThreadParticipant).filter(ThreadParticipant.user_id == user_a_id).all()
    }
    # Find threads user_b is part of
    b_thread_ids = {
        tp.thread_id for tp in
        db.query(ThreadParticipant).filter(ThreadParticipant.user_id == user_b_id).all()
    }
    shared = a_thread_ids & b_thread_ids

    for thread_id in shared:
        thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
        if not thread or thread.is_announcement:
            continue
        participant_count = db.query(ThreadParticipant).filter(
            ThreadParticipant.thread_id == thread_id
        ).count()
        if participant_count == 2:
            return thread

    # No existing 1:1 thread found — create one
    new_thread = MessageThread(
        is_announcement=False,
        created_by=user_a_id,
        created_at=datetime.utcnow().isoformat() + "Z",
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)

    db.add(ThreadParticipant(thread_id=new_thread.id, user_id=user_a_id))
    db.add(ThreadParticipant(thread_id=new_thread.id, user_id=user_b_id))
    db.commit()

    return new_thread


def _can_message(db: Session, sender: User, recipient: User) -> bool:
    """Enforces who's allowed to start a 1:1 thread with whom."""
    sender_role = sender.role.value
    recipient_role = recipient.role.value

    if sender_role == "coordinator":
        if recipient_role == "teacher":
            return True
        if recipient_role == "parent":
            has_family = db.query(ParentFamily).filter(ParentFamily.parent_id == recipient.id).first()
            return has_family is not None
        return False

    if sender_role == "teacher":
        if recipient_role == "coordinator":
            return True
        if recipient_role == "parent":
            club = db.query(Club).filter(Club.teacher_id == sender.id).first()
            if not club:
                return False
            family_ids = {
                link.family_id for link in
                db.query(ParentFamily).filter(ParentFamily.parent_id == recipient.id).all()
            }
            if not family_ids:
                return False
            students_in_families = db.query(Student).filter(Student.family_id.in_(family_ids)).all()
            student_ids = [s.id for s in students_in_families]
            enrolled = db.query(Assignment).filter(
                Assignment.club_id == club.id,
                Assignment.student_id.in_(student_ids)
            ).first()
            return enrolled is not None
        return False

    if sender_role == "parent":
        if recipient_role == "teacher":
            family_ids = {
                link.family_id for link in
                db.query(ParentFamily).filter(ParentFamily.parent_id == sender.id).all()
            }
            if not family_ids:
                return False
            students = db.query(Student).filter(Student.family_id.in_(family_ids)).all()
            student_ids = [s.id for s in students]
            clubs = db.query(Club).filter(Club.teacher_id == recipient.id).all()
            for club in clubs:
                enrolled = db.query(Assignment).filter(
                    Assignment.club_id == club.id,
                    Assignment.student_id.in_(student_ids)
                ).first()
                if enrolled:
                    return True
            return False
        return False

    return False


# ---------- Get the school's coordinator (for teacher/parent "message coordinator" flows) ----------

@router.get("/coordinator-contact")
def get_coordinator_contact(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the coordinator for the current user's school, to start a thread with."""
    coordinator = db.query(User).filter(
        User.role == "coordinator",
        User.school_id == current_user.school_id
    ).first()
    if not coordinator:
        raise HTTPException(status_code=404, detail="No coordinator found for your school")
    return {
        "id": coordinator.id,
        "name": f"{coordinator.first_name} {coordinator.last_name}",
    }

# ---------- Start or continue a 1:1 thread ----------

@router.post("/start")
def start_thread(
    request: StartThreadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finds or creates a 1:1 thread with the given recipient, then sends the message.
    NOTE: audience/permission validation (who's allowed to message whom) is added
    in a follow-up step — this version allows any two valid user ids.
    """
    recipient = db.query(User).filter(User.id == request.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a thread with yourself")

    if not _can_message(db, current_user, recipient):
        raise HTTPException(status_code=403, detail="You are not permitted to message this person")

    thread = _get_or_create_1on1_thread(db, current_user.id, recipient.id)

    new_message = Message(
        thread_id=thread.id,
        sender_id=current_user.id,
        body=request.body.strip(),
        sent_at=datetime.utcnow().isoformat() + "Z",
    )
    db.add(new_message)
    db.commit()

    return {"thread_id": thread.id, "message": "Message sent."}


# ---------- Send a message into an existing thread ----------

@router.post("/{thread_id}/send")
def send_message(
    thread_id: int,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message into an existing thread the user is part of."""
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    is_participant = db.query(ThreadParticipant).filter(
        ThreadParticipant.thread_id == thread_id,
        ThreadParticipant.user_id == current_user.id
    ).first()
    if not is_participant:
        raise HTTPException(status_code=403, detail="You are not part of this thread")

    if thread.is_announcement and thread.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="This is an announcement. Start a new thread with the sender to ask a question."
        )

    if not request.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    new_message = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        body=request.body.strip(),
        sent_at=datetime.utcnow().isoformat() + "Z",
    )
    db.add(new_message)
    db.commit()

    return {"message": "Message sent."}


# ---------- List my threads ----------

@router.get("/mine")
def list_my_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    All threads the current user participates in, with the other participant(s)
    and a preview of the most recent message.
    """
    my_thread_ids = [
        tp.thread_id for tp in
        db.query(ThreadParticipant).filter(ThreadParticipant.user_id == current_user.id).all()
    ]

    result = []
    for thread_id in my_thread_ids:
        thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
        if not thread:
            continue

        other_participants = db.query(ThreadParticipant).filter(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id != current_user.id
        ).all()
        other_users = []
        for p in other_participants:
            u = db.query(User).filter(User.id == p.user_id).first()
            if u:
                other_users.append({"id": u.id, "name": f"{u.first_name} {u.last_name}", "role": u.role.value})

        last_message = db.query(Message).filter(
            Message.thread_id == thread_id
        ).order_by(Message.sent_at.desc()).first()

        creator = db.query(User).filter(User.id == thread.created_by).first()

        result.append({
            "thread_id": thread.id,
            "is_announcement": thread.is_announcement,
            "subject": thread.subject,
            "created_by": thread.created_by,
            "created_by_role": creator.role.value if creator else None,
            "participants": other_users,
            "last_message": {
                "body": last_message.body,
                "sender_id": last_message.sender_id,
                "sent_at": last_message.sent_at,
            } if last_message else None,
        })

    result.sort(key=lambda t: t["last_message"]["sent_at"] if t["last_message"] else "", reverse=True)
    return result



# ---------- Parent: list their kids' club teachers ----------

@router.get("/my-teachers")
def my_teachers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns each teacher assigned to a club one of the parent's kids is enrolled in."""
    if current_user.role.value != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this")

    family_ids = {
        link.family_id for link in
        db.query(ParentFamily).filter(ParentFamily.parent_id == current_user.id).all()
    }
    if not family_ids:
        return []

    students = db.query(Student).filter(Student.family_id.in_(family_ids)).all()
    student_ids = [s.id for s in students]
    if not student_ids:
        return []

    assignments = db.query(Assignment).filter(Assignment.student_id.in_(student_ids)).all()
    club_ids = {a.club_id for a in assignments}

    result = []
    seen_teacher_ids = set()
    for club_id in club_ids:
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club or not club.teacher_id or club.teacher_id in seen_teacher_ids:
            continue
        teacher = db.query(User).filter(User.id == club.teacher_id).first()
        if not teacher:
            continue
        seen_teacher_ids.add(teacher.id)
        result.append({
            "id": teacher.id,
            "name": f"{teacher.first_name} {teacher.last_name}",
            "club_name": club.name,
        })

    return result

# ---------- Get messages in a thread ----------

@router.get("/{thread_id}")
def get_thread_messages(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Full message history for a thread the user is part of."""
    is_participant = db.query(ThreadParticipant).filter(
        ThreadParticipant.thread_id == thread_id,
        ThreadParticipant.user_id == current_user.id
    ).first()
    if not is_participant:
        raise HTTPException(status_code=403, detail="You are not part of this thread")

    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    messages = db.query(Message).filter(
        Message.thread_id == thread_id
    ).order_by(Message.sent_at).all()

    return {
        "thread_id": thread.id,
        "is_announcement": thread.is_announcement,
        "created_by": thread.created_by,
        "subject": thread.subject,
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "body": m.body,
                "sent_at": m.sent_at,
            }
            for m in messages
        ],
    }

# ---------- Send an announcement ----------

@router.post("/announcements")
def send_announcement(
    request: AnnouncementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a one-way announcement thread to a resolved audience.
    Coordinators: club_parents, all_families, teacher, all_teachers.
    Teachers: my_class only (their own club's families).
    """
    role = current_user.role.value
    recipient_ids = set()

    if role == "coordinator":
        if request.audience_type == "club_parents":
            if not request.club_id:
                raise HTTPException(status_code=400, detail="club_id is required for this audience")
            students = db.query(Student).join(
                Assignment, Assignment.student_id == Student.id
            ).filter(Assignment.club_id == request.club_id).all()
            family_ids = {s.family_id for s in students}
            links = db.query(ParentFamily).filter(ParentFamily.family_id.in_(family_ids)).all()
            recipient_ids = {l.parent_id for l in links}

        elif request.audience_type == "all_families":
            links = db.query(ParentFamily).all()
            recipient_ids = {l.parent_id for l in links}

        elif request.audience_type == "teacher":
            if not request.teacher_id:
                raise HTTPException(status_code=400, detail="teacher_id is required for this audience")
            recipient_ids = {request.teacher_id}

        elif request.audience_type == "all_teachers":
            teachers = db.query(User).filter(User.role == "teacher").all()
            recipient_ids = {t.id for t in teachers}

        else:
            raise HTTPException(status_code=400, detail="Invalid audience_type for coordinator")

    elif role == "teacher":
        if request.audience_type != "my_class":
            raise HTTPException(status_code=403, detail="Teachers can only announce to their own class")

        club = db.query(Club).filter(Club.teacher_id == current_user.id).first()
        if not club:
            raise HTTPException(status_code=400, detail="You have no assigned club")

        students = db.query(Student).join(
            Assignment, Assignment.student_id == Student.id
        ).filter(Assignment.club_id == club.id).all()
        family_ids = {s.family_id for s in students}
        links = db.query(ParentFamily).filter(ParentFamily.family_id.in_(family_ids)).all()
        recipient_ids = {l.parent_id for l in links}

    else:
        raise HTTPException(status_code=403, detail="Only coordinators and teachers can send announcements")

    if not recipient_ids:
        raise HTTPException(status_code=400, detail="No recipients found for this audience")

    new_thread = MessageThread(
        is_announcement=True,
        created_by=current_user.id,
        created_at=datetime.utcnow().isoformat() + "Z",
        subject=request.subject.strip(),
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)

    # sender is a participant too, so they see it in their own thread list
    db.add(ThreadParticipant(thread_id=new_thread.id, user_id=current_user.id))
    for uid in recipient_ids:
        db.add(ThreadParticipant(thread_id=new_thread.id, user_id=uid))
    db.commit()

    new_message = Message(
        thread_id=new_thread.id,
        sender_id=current_user.id,
        body=request.body.strip(),
        sent_at=datetime.utcnow().isoformat() + "Z",
    )
    db.add(new_message)
    db.commit()

    return {"thread_id": new_thread.id, "recipient_count": len(recipient_ids), "message": "Announcement sent."}

@router.post("/thread-with")
def get_or_create_thread_with(
    request: ThreadWithRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finds or creates a 1:1 thread with the recipient WITHOUT sending a message.
    Used when opening a conversation tab, so no placeholder message is created.
    """
    recipient = db.query(User).filter(User.id == request.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a thread with yourself")

    if not _can_message(db, current_user, recipient):
        raise HTTPException(status_code=403, detail="You are not permitted to message this person")

    thread = _get_or_create_1on1_thread(db, current_user.id, recipient.id)
    return {"thread_id": thread.id}


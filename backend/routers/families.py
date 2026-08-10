import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import hash_password, create_access_token, get_current_user, require_parent
from models.user import User, UserRole
from models.family import Family
from models.student import Student
from models.parent_family import ParentFamily
from models.authorized_pickup import AuthorizedPickup
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.club import Club
from models.meeting_date import MeetingDate

router = APIRouter(prefix="/families", tags=["Families"])

DEFAULT_SCHOOL_ID = 1  # single-school (PPE) for now


class StudentInput(BaseModel):
    first_name: str
    last_name: str
    grade: int
    teacher: str
    choice1: str | None = None
    choice2: str | None = None
    choice3: str | None = None


class PickupInput(BaseModel):
    name: str
    phone: str | None = None
    relationship_to_student: str | None = None


class RegisterCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    phone: str = ""
    phone2: str | None = None
    phone2_owner: str | None = None
    dismissal_method: str = "car"
    students: list[StudentInput]
    pickups: list[PickupInput] = []


class RegisterJoin(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    join_code: str


class ChoicesUpdate(BaseModel):
    choice1: str | None = None
    choice2: str | None = None
    choice3: str | None = None


def generate_join_code(db: Session) -> str:
    """Generate a unique short code like 'PPE-7K2Q' (no ambiguous chars)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(50):
        code = "PPE-" + "".join(random.choice(alphabet) for _ in range(4))
        if not db.query(Family).filter(Family.join_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique join code")


@router.post("/register-create")
def register_create(data: RegisterCreate, db: Session = Depends(get_db)):
    """
    All-at-once: create the parent account, their family (with join code),
    link them as creator, and add their students. Returns a login token + join code.
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if not data.students:
        raise HTTPException(status_code=400, detail="At least one student is required")

    parent = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.parent,
        school_id=DEFAULT_SCHOOL_ID,
    )
    db.add(parent)
    db.flush()

    join_code = generate_join_code(db)
    family = Family(
        family_name=data.last_name,
        dismissal_method=data.dismissal_method or "car",
        parent_first_name=data.first_name,
        parent_last_name=data.last_name,
        phone=data.phone or "",
        phone2=data.phone2,
        phone2_owner=data.phone2_owner,
        email=data.email,
        school_id=DEFAULT_SCHOOL_ID,
        join_code=join_code,
    )
    db.add(family)
    db.flush()

    db.add(ParentFamily(parent_id=parent.id, family_id=family.id, role="creator"))

    for s in data.students:
        db.add(Student(
            first_name=s.first_name,
            last_name=s.last_name,
            grade=s.grade,
            teacher=s.teacher,
            family_id=family.id,
            choice1=s.choice1,
            choice2=s.choice2,
            choice3=s.choice3,
        ))

    for p in data.pickups:
        if p.name and p.name.strip():
            db.add(AuthorizedPickup(
                name=p.name.strip(),
                phone=(p.phone or "").strip() or None,
                relationship_to_student=(p.relationship_to_student or "").strip() or None,
                family_id=family.id,
            ))

    db.commit()

    token = create_access_token(data={"sub": parent.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "parent",
        "first_name": parent.first_name,
        "family_id": family.id,
        "join_code": join_code,
    }


@router.post("/register-join")
def register_join(data: RegisterJoin, db: Session = Depends(get_db)):
    """
    Create the parent account and link them to an existing family via join code.
    Validates the code first so a bad code never creates an orphaned account.
    """
    family = db.query(Family).filter(Family.join_code == data.join_code.strip()).first()
    if not family:
        raise HTTPException(status_code=404, detail="Invalid family code")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    parent = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.parent,
        school_id=DEFAULT_SCHOOL_ID,
    )
    db.add(parent)
    db.flush()

    existing = db.query(ParentFamily).filter(
        ParentFamily.parent_id == parent.id,
        ParentFamily.family_id == family.id
    ).first()
    if not existing:
        db.add(ParentFamily(parent_id=parent.id, family_id=family.id, role="member"))

    db.commit()

    token = create_access_token(data={"sub": parent.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "parent",
        "first_name": parent.first_name,
        "family_id": family.id,
    }


@router.get("/mine")
def my_families(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Return the families this parent is linked to, with students and their role."""
    links = db.query(ParentFamily).filter(ParentFamily.parent_id == current_user.id).all()

    result = []
    for link in links:
        family = db.query(Family).filter(Family.id == link.family_id).first()
        if not family:
            continue
        students = db.query(Student).filter(Student.family_id == family.id).all()

        students_out = []
        for s in students:
            assignment_info = None
            assignment = db.query(Assignment).filter(Assignment.student_id == s.id).first()
            if assignment:
                club = db.query(Club).filter(Club.id == assignment.club_id).first()
                if club:
                    meetings = db.query(MeetingDate).filter(MeetingDate.club_id == club.id).order_by(MeetingDate.date).all()
                    assignment_info = {
                        "club_name": club.name,
                        "room_number": club.room_number,
                        "dismissal_location": club.dismissal_location,
                        "instructor": club.instructor,
                        "meeting_dates": [
                            {"date": m.date, "start_time": m.start_time, "end_time": m.end_time}
                            for m in meetings
                        ],
                    }

            waitlists = []
            for w in db.query(Waitlist).filter(Waitlist.student_id == s.id).all():
                wclub = db.query(Club).filter(Club.id == w.club_id).first()
                waitlists.append({
                    "club_name": wclub.name if wclub else "",
                    "position": w.position,
                    "pending_confirmation": w.pending_confirmation,
                })

            students_out.append({
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "grade": s.grade,
                "teacher": s.teacher,
                "choice1": s.choice1,
                "choice2": s.choice2,
                "choice3": s.choice3,
                "assignment": assignment_info,
                "waitlists": waitlists,
            })

        result.append({
            "family_id": family.id,
            "family_name": family.family_name,
            "role": link.role,
            "join_code": family.join_code if link.role == "creator" else None,
            "dismissal_method": family.dismissal_method,
            "students": students_out,
        })

    return result


@router.put("/students/{student_id}/choices")
def update_choices(
    student_id: int,
    data: ChoicesUpdate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Update a student's club choices. Only the family creator may edit."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    link = db.query(ParentFamily).filter(
        ParentFamily.parent_id == current_user.id,
        ParentFamily.family_id == student.family_id
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="You are not linked to this family")
    if link.role != "creator":
        raise HTTPException(status_code=403, detail="Only the family creator can edit club choices")

    student.choice1 = data.choice1
    student.choice2 = data.choice2
    student.choice3 = data.choice3
    db.commit()

    return {"message": "Club choices updated."}
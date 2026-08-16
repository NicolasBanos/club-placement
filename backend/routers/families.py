import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import hash_password, create_access_token, get_current_user, require_parent, require_coordinator
from models.user import User, UserRole
from models.family import Family
from models.student import Student
from models.parent_family import ParentFamily
from models.authorized_pickup import AuthorizedPickup
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.club import Club
from models.meeting_date import MeetingDate
from typing import Optional
from models.school import School

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

class AddStudent(BaseModel):
    family_id: int
    first_name: str
    last_name: str
    grade: int
    teacher: str
    choice1: str | None = None
    choice2: str | None = None
    choice3: str | None = None


class EditTeacher(BaseModel):
    teacher: str


class AddPickup(BaseModel):
    family_id: int
    name: str
    phone: str | None = None
    relationship_to_student: str | None = None


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

        pickups = db.query(AuthorizedPickup).filter(AuthorizedPickup.family_id == family.id).all()
        result.append({
            "family_id": family.id,
            "family_name": family.family_name,
            "role": link.role,
            "join_code": family.join_code if link.role == "creator" else None,
            "dismissal_method": family.dismissal_method,
            "students": students_out,
            "pickups": [
                {"id": p.id, "name": p.name, "phone": p.phone, "relationship_to_student": p.relationship_to_student}
                for p in pickups
            ],
            "email": family.email,
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
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if school and school.registration_locked:
        raise HTTPException(status_code=403, detail="The window for registration edits has passed. Contact your child's teacher if you need to make a change.")

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

def _require_creator(db: Session, parent_id: int, family_id: int):
    """Raise unless this parent is the CREATOR of the given family."""
    link = db.query(ParentFamily).filter(
        ParentFamily.parent_id == parent_id,
        ParentFamily.family_id == family_id,
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="You are not linked to this family")
    if link.role != "creator":
        raise HTTPException(status_code=403, detail="Only the family creator can make changes")
    return link


@router.post("/students")
def add_student(
    data: AddStudent,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Add a child to the family (creator only)."""
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if school and school.registration_locked:
        raise HTTPException(status_code=403, detail="The window for registration edits has passed. Contact your child's teacher if you need to make a change.")

    _require_creator(db, current_user.id, data.family_id)
    student = Student(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        grade=data.grade,
        teacher=data.teacher.strip(),
        family_id=data.family_id,
        choice1=data.choice1,
        choice2=data.choice2,
        choice3=data.choice3,
    )
    db.add(student)
    db.commit()
    return {"message": "Child added.", "student_id": student.id}


@router.put("/students/{student_id}/teacher")
def edit_teacher(
    student_id: int,
    data: EditTeacher,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Edit a child's teacher (coordinator only, for corrections)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.teacher = data.teacher.strip()
    db.commit()
    return {"message": "Teacher updated."}


@router.post("/pickups")
def add_pickup(
    data: AddPickup,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Add an authorized pickup person to the family (creator only)."""
    _require_creator(db, current_user.id, data.family_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Pickup name is required")
    pickup = AuthorizedPickup(
        name=data.name.strip(),
        phone=(data.phone or "").strip() or None,
        relationship_to_student=(data.relationship_to_student or "").strip() or None,
        family_id=data.family_id,
    )
    db.add(pickup)
    db.commit()
    return {"message": "Pickup added.", "pickup_id": pickup.id}


@router.delete("/pickups/{pickup_id}")
def remove_pickup(
    pickup_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Remove an authorized pickup person (creator only)."""
    pickup = db.query(AuthorizedPickup).filter(AuthorizedPickup.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    _require_creator(db, current_user.id, pickup.family_id)
    db.delete(pickup)
    db.commit()
    return {"message": "Pickup removed."}
class FamilyContactUpdate(BaseModel):
    phone: Optional[str] = None
    phone2: Optional[str] = None
    phone2_owner: Optional[str] = None
    email: Optional[str] = None



@router.put("/{family_id}/contact")
def update_family_contact(
    family_id: int,
    update: FamilyContactUpdate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Update the family's shared contact info. Any linked parent (creator or member) can edit."""
    link = db.query(ParentFamily).filter(
        ParentFamily.parent_id == current_user.id,
        ParentFamily.family_id == family_id
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="You are not linked to this family")

    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    if update.phone is not None:
        family.phone = update.phone.strip()
    if update.phone2 is not None:
        family.phone2 = update.phone2.strip() or None
    if update.phone2_owner is not None:
        family.phone2_owner = update.phone2_owner.strip() or None
    if update.email is not None:
        family.email = update.email.strip()

    db.commit()
    return {"message": "Contact info updated successfully."}
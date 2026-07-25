from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database.connection import get_db
from core.auth import require_coordinator, hash_password
from models.user import User, UserRole
from models.club import Club

router = APIRouter(prefix="/users", tags=["Users"])


class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    club_id: Optional[int] = None


@router.get("/teachers")
def get_teachers(
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Get all teacher accounts"""
    teachers = db.query(User).filter(User.role == UserRole.teacher).all()

    result = []
    for teacher in teachers:
        # Find their assigned club
        assigned_club = None
        if teacher.school_id:
            club = db.query(Club).filter(Club.id == teacher.school_id).first()
            if club:
                assigned_club = club.name

        result.append({
            "id": teacher.id,
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "email": teacher.email,
            "assigned_club": assigned_club,
        })

    return result


@router.post("/teachers")
def create_teacher(
    teacher_data: TeacherCreate,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Create a new teacher account"""
    # Check if email already exists
    existing = db.query(User).filter(User.email == teacher_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_teacher = User(
        first_name=teacher_data.first_name,
        last_name=teacher_data.last_name,
        email=teacher_data.email,
        hashed_password=hash_password(teacher_data.password),
        role=UserRole.teacher,
        school_id=current_user.school_id,
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    return {
        "message": f"Teacher account created for {new_teacher.first_name} {new_teacher.last_name}",
        "id": new_teacher.id
    }


@router.delete("/teachers/{teacher_id}")
def deactivate_teacher(
    teacher_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Delete a teacher account"""
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == UserRole.teacher
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    db.delete(teacher)
    db.commit()

    return {"message": f"Teacher account removed successfully"}
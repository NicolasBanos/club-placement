from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database.connection import get_db
from core.auth import require_coordinator, get_current_user
from core.spreadsheet_importer import read_spreadsheet, import_homeroom_teachers
from models.user import User
from models.homeroom_teacher import HomeroomTeacher

router = APIRouter(prefix="/homeroom-teachers", tags=["Homeroom Teachers"])


class TeacherCreate(BaseModel):
    name: str
    grade: int


@router.get("/")
def list_homeroom_teachers(
    grade: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List homeroom teachers for the user's school, optionally filtered by grade."""
    query = db.query(HomeroomTeacher).filter(HomeroomTeacher.school_id == current_user.school_id)
    if grade is not None:
        query = query.filter(HomeroomTeacher.grade == grade)
    teachers = query.order_by(HomeroomTeacher.name).all()
    return [{"id": t.id, "name": t.name, "grade": t.grade} for t in teachers]

@router.get("/public")
def list_homeroom_teachers_public(
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Public, unauthenticated list of homeroom teachers, for the registration form.
    Single-school phase, so no school_id filter needed here.
    """
    query = db.query(HomeroomTeacher)
    if grade is not None:
        query = query.filter(HomeroomTeacher.grade == grade)
    teachers = query.order_by(HomeroomTeacher.name).all()
    return [{"id": t.id, "name": t.name, "grade": t.grade} for t in teachers]


@router.post("/")
def add_homeroom_teacher(
    data: TeacherCreate,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Add a single homeroom teacher."""
    if data.grade < 0 or data.grade > 5:
        raise HTTPException(status_code=400, detail="Grade must be between 0 and 5")

    name = data.name.strip()
    existing = db.query(HomeroomTeacher).filter(
        HomeroomTeacher.name.ilike(name),
        HomeroomTeacher.grade == data.grade,
        HomeroomTeacher.school_id == current_user.school_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This teacher and grade combination already exists")

    teacher = HomeroomTeacher(name=name, grade=data.grade, school_id=current_user.school_id)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return {"id": teacher.id, "name": teacher.name, "grade": teacher.grade}


@router.delete("/{teacher_id}")
def delete_homeroom_teacher(
    teacher_id: int,
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Remove a homeroom teacher."""
    teacher = db.query(HomeroomTeacher).filter(
        HomeroomTeacher.id == teacher_id,
        HomeroomTeacher.school_id == current_user.school_id,
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher removed."}


@router.post("/import")
def import_homeroom_teachers_spreadsheet(
    file: UploadFile = File(...),
    current_user: User = Depends(require_coordinator),
    db: Session = Depends(get_db)
):
    """Bulk import homeroom teachers from a spreadsheet with 'name' and 'grade' columns."""
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload .xlsx, .xls, or .csv")

    content = file.file.read()
    try:
        df = read_spreadsheet(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        report = import_homeroom_teachers(df, db, current_user.school_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"filename": file.filename, "report": report}
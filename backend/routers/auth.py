from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.user import User, UserRole
from core.auth import hash_password, verify_password, create_access_token, get_current_user, require_coordinator, require_teacher, require_parent

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- Schemas (what data we expect) ---

class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str
    school_id: int | None = None


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    first_name: str


# --- Endpoints ---

@router.post("/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.
    Checks if email is already taken before creating.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate role
    valid_roles = [r.value for r in UserRole]
    if user_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )

    # Create new user
    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=UserRole(user_data.role),
        school_id=user_data.school_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": f"Account created successfully for {new_user.first_name}"}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    Returns a JWT token if credentials are valid.
    """
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()

    # Check password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token
    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "first_name": user.first_name
    }


@router.get("/me")
def get_me(db: Session = Depends(get_db), token: str = Depends(lambda: None)):
    """
    Returns the currently logged in user's info.
    """
    return {"message": "This endpoint will return current user info"}

from core.auth import hash_password, verify_password, create_access_token, get_current_user, require_coordinator, require_teacher, require_parent

@router.get("/coordinator-only")
def coordinator_only(current_user: User = Depends(require_coordinator)):
    """Test endpoint — only coordinators can access this"""
    return {"message": f"Welcome coordinator {current_user.first_name}!"}


@router.get("/teacher-only")
def teacher_only(current_user: User = Depends(require_teacher)):
    """Test endpoint — only teachers and coordinators can access this"""
    return {"message": f"Welcome {current_user.role.value} {current_user.first_name}!"}


@router.get("/parent-only")
def parent_only(current_user: User = Depends(require_parent)):
    """Test endpoint — only parents can access this"""
    return {"message": f"Welcome parent {current_user.first_name}!"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the currently logged in user's info"""
    return {
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "role": current_user.role.value
    }
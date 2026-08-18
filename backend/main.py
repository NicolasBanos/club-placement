from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth
from routers import import_data
from routers import dashboard
from routers import clubs
from routers import users
from routers import lottery
from routers import roster
from models.user import User
from models.parent_school import ParentSchool
from models.school import School
from models.family import Family
from models.student import Student
from models.club import Club
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate
from models.authorized_pickup import AuthorizedPickup
from routers import attendance
from models.attendance import Attendance
from routers import families
from routers import messages
from routers import homeroom_teachers
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

app = FastAPI(title="ClubsForKids API")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow React frontend to talk to FastAPI
# In production, set ALLOWED_ORIGINS in .env to your real domain(s), comma-separated
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(import_data.router)
app.include_router(dashboard.router)
app.include_router(clubs.router)
app.include_router(users.router)
app.include_router(lottery.router)
app.include_router(roster.router)
app.include_router(attendance.router)
app.include_router(families.router)
app.include_router(messages.router)
app.include_router(homeroom_teachers.router)


@app.get("/")
def read_root():
    return {"message": "ClubsForKids API is running!"}
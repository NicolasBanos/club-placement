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

app = FastAPI(title="ClubsForKids API")

# Allow React frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
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

@app.get("/")
def read_root():
    return {"message": "ClubsForKids API is running!"}
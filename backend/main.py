from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth
from routers import import_data
from routers import dashboard
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

@app.get("/")
def read_root():
    return {"message": "ClubsForKids API is running!"}
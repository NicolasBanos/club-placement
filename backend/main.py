from fastapi import FastAPI
from routers import auth
from routers import import_data
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

app.include_router(auth.router)
app.include_router(import_data.router)

@app.get("/")
def read_root():
    return {"message": "ClubsForKids API is running!"}
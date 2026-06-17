from database.connection import Base, engine
from models.family import Family
from models.authorized_pickup import AuthorizedPickup
from models.student import Student
from models.club import Club
from models.assignment import Assignment
from models.waitlist import Waitlist
from models.meeting_date import MeetingDate


def init_db():
    """
    Creates all tables in the database based on our models.
    Run this once to set up the database file.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


if __name__ == "__main__":
    init_db()
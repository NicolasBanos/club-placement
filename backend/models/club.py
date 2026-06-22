from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    instructor = Column(String, nullable=False)
    grade_min = Column(Integer, nullable=False)
    grade_max = Column(Integer, nullable=False)
    max_students = Column(Integer, nullable=False)
    room_number = Column(String, nullable=False)
    dismissal_location = Column(String, nullable=False)
    description = Column(String, nullable=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    school = relationship("School", back_populates="clubs")
    assignments = relationship("Assignment", back_populates="club")
    waitlist_entries = relationship("Waitlist", back_populates="club")
    meeting_dates = relationship("MeetingDate", back_populates="club")
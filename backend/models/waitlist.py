from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    position = Column(Integer, nullable=False)

    student = relationship("Student", back_populates="waitlist_entries")
    club = relationship("Club", back_populates="waitlist_entries")
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, unique=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    assigned_date = Column(String, nullable=False)

    student = relationship("Student", back_populates="assignment")
    club = relationship("Club", back_populates="assignments")
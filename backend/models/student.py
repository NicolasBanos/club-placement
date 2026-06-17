from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)
    teacher = Column(String, nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)

    family = relationship("Family", back_populates="students")
    assignment = relationship("Assignment", back_populates="student", uselist=False)
    waitlist_entries = relationship("Waitlist", back_populates="student")
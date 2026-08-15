from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database.connection import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    meeting_date_id = Column(Integer, ForeignKey("meeting_dates.id"), nullable=False)

    status = Column(String, nullable=False)
    late_pickup = Column(Boolean, default=False)

    excuse_reason = Column(String, nullable=True)
    excuse_status = Column(String, default="none")
    submitted_at = Column(String, nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(String, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    student = relationship("Student")
    meeting_date = relationship("MeetingDate")

    __table_args__ = (
        UniqueConstraint("student_id", "meeting_date_id", name="uix_student_meeting"),
    )
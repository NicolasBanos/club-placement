from sqlalchemy import Column, Integer, String, ForeignKey
from database.connection import Base


class HomeroomTeacher(Base):
    __tablename__ = "homeroom_teachers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
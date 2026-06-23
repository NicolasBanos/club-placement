from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class UserRole(enum.Enum):
    parent = "parent"
    teacher = "teacher"
    coordinator = "coordinator"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)

    school = relationship("School", back_populates="users")
    schools = relationship("ParentSchool", back_populates="parent")
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from database.connection import Base


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    school_code = Column(String, nullable=False, unique=True)
    registration_locked = Column(Boolean, nullable=False, default=False)

    clubs = relationship("Club", back_populates="school")
    users = relationship("User", back_populates="school")
    parents = relationship("ParentSchool", back_populates="school")
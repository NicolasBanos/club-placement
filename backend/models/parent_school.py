from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class ParentSchool(Base):
    __tablename__ = "parent_schools"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    # Relationships
    parent = relationship("User", back_populates="schools")
    school = relationship("School", back_populates="parents")
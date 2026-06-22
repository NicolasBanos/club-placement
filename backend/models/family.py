from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    family_name = Column(String, nullable=False)
    dismissal_method = Column(String, nullable=False)
    parent_first_name = Column(String, nullable=False)
    parent_last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    students = relationship("Student", back_populates="family")
    authorized_pickups = relationship("AuthorizedPickup", back_populates="family")
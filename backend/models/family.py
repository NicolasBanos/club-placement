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
    phone2 = Column(String, nullable=True)
    phone2_owner = Column(String, nullable=True)
    email = Column(String, nullable=False)
    join_code = Column(String, nullable=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    students = relationship("Student", back_populates="family")
    authorized_pickups = relationship("AuthorizedPickup", back_populates="family")
    parent_links = relationship("ParentFamily", back_populates="family")
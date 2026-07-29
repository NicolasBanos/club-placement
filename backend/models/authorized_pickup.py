from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class AuthorizedPickup(Base):
    __tablename__ = "authorized_pickups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    relationship_to_student = Column(String, nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)

    family = relationship("Family", back_populates="authorized_pickups")
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class ParentFamily(Base):
    __tablename__ = "parent_families"
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    role = Column(String, nullable=False, default="member")  # "creator" | "member"

    # Relationships
    parent = relationship("User", back_populates="families")
    family = relationship("Family", back_populates="parent_links")
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class MessageThread(Base):
    __tablename__ = "message_threads"

    id = Column(Integer, primary_key=True, index=True)
    is_announcement = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(String, nullable=False)
    subject = Column(String, nullable=True)

    participants = relationship("ThreadParticipant", back_populates="thread")
    messages = relationship("Message", back_populates="thread")
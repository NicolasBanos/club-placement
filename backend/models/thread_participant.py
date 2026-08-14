from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class ThreadParticipant(Base):
    __tablename__ = "thread_participants"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    thread = relationship("MessageThread", back_populates="participants")
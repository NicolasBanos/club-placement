from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(String, nullable=False)
    sent_at = Column(String, nullable=False)

    thread = relationship("MessageThread", back_populates="messages")
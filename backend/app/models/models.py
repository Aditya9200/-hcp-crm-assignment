from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import enum


class SentimentEnum(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class InteractionTypeEnum(str, enum.Enum):
    meeting = "Meeting"
    call = "Call"
    email = "Email"
    conference = "Conference"
    virtual = "Virtual"


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    specialty = Column(String(255))
    institution = Column(String(255))
    email = Column(String(255), unique=True)
    phone = Column(String(50))
    territory = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interactions = relationship("Interaction", back_populates="hcp")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False)
    interaction_type = Column(Enum(InteractionTypeEnum), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    attendees = Column(JSON, default=[])
    topics_discussed = Column(Text)
    materials_shared = Column(JSON, default=[])
    samples_distributed = Column(JSON, default=[])
    sentiment = Column(Enum(SentimentEnum), default=SentimentEnum.neutral)
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_summary = Column(Text)
    ai_suggested_followups = Column(JSON, default=[])
    raw_chat_log = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    hcp = relationship("HCP", back_populates="interactions")


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), unique=True, nullable=False)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=True)
    messages = Column(JSON, default=[])
    state = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class SentimentEnum(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class InteractionTypeEnum(str, Enum):
    meeting = "Meeting"
    call = "Call"
    email = "Email"
    conference = "Conference"
    virtual = "Virtual"


# HCP Schemas
class HCPBase(BaseModel):
    name: str
    specialty: Optional[str] = None
    institution: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    territory: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPResponse(HCPBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionBase(BaseModel):
    hcp_id: int
    interaction_type: InteractionTypeEnum
    date: datetime
    attendees: Optional[List[str]] = []
    topics_discussed: Optional[str] = None
    materials_shared: Optional[List[str]] = []
    samples_distributed: Optional[List[dict]] = []
    sentiment: Optional[SentimentEnum] = SentimentEnum.neutral
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    interaction_type: Optional[InteractionTypeEnum] = None
    date: Optional[datetime] = None
    attendees: Optional[List[str]] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[List[str]] = None
    samples_distributed: Optional[List[dict]] = None
    sentiment: Optional[SentimentEnum] = None
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None


class InteractionResponse(InteractionBase):
    id: int
    ai_summary: Optional[str] = None
    ai_suggested_followups: Optional[List[str]] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    hcp: Optional[HCPResponse] = None

    class Config:
        from_attributes = True


# Agent Schemas
class AgentMessageRequest(BaseModel):
    session_id: str
    message: str
    hcp_id: Optional[int] = None


class AgentMessageResponse(BaseModel):
    session_id: str
    response: str
    action_taken: Optional[str] = None
    interaction_id: Optional[int] = None
    state: Optional[dict] = None


class ChatMessage(BaseModel):
    role: str
    content: str

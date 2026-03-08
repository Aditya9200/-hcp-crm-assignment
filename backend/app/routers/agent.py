from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.schemas import AgentMessageRequest, AgentMessageResponse
from app.agents.hcp_agent import AgentSessionManager
import uuid

router = APIRouter()


@router.post("/chat", response_model=AgentMessageResponse)
async def chat_with_agent(
    payload: AgentMessageRequest,
    db: Session = Depends(get_db)
):
    """Main endpoint for conversational interaction with the LangGraph agent."""
    try:
        manager = AgentSessionManager(db)
        result = await manager.chat(
            session_id=payload.session_id,
            user_message=payload.message,
            hcp_id=payload.hcp_id
        )
        return AgentMessageResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/session/new")
def create_session():
    """Generate a new session ID for a chat conversation."""
    return {"session_id": str(uuid.uuid4())}


@router.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get messages for an existing session."""
    from app.models.models import AgentSession
    session = db.query(AgentSession).filter(
        AgentSession.session_id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "messages": session.messages,
        "state": session.state
    }

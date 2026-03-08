"""
LangGraph AI Agent for HCP Interaction Management
Tools:
1. log_interaction     - Capture & summarize interaction via LLM
2. edit_interaction    - Modify existing logged interaction
3. search_hcp         - Search HCP database
4. get_interaction_history - Retrieve past interactions for an HCP
5. suggest_followups  - AI-powered follow-up recommendations
"""

import os
import json
import uuid
from datetime import datetime
from typing import Annotated, TypedDict, Optional, List
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from sqlalchemy.orm import Session
from app.models.models import Interaction, HCP, AgentSession

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
FALLBACK_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# ─────────────────────────────────────────────
# Agent State
# ─────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    hcp_id: Optional[int]
    last_action: Optional[str]
    interaction_draft: Optional[dict]
    db_session: Optional[object]


# ─────────────────────────────────────────────
# Tool Definitions
# ─────────────────────────────────────────────

def make_tools(db: Session):
    """Factory: create tool functions bound to a DB session."""

    @tool
    def log_interaction(
        hcp_id: str,
        interaction_type: str,
        date: str,
        topics_discussed: str,
        outcomes: str,
        sentiment: str = "neutral",
        attendees: str = "",
        materials_shared: str = "",
        samples_distributed: str = "",
        follow_up_actions: str = ""
    ) -> dict:
        """
        Tool 1 - Log Interaction.
        Captures a new HCP interaction. The LLM summarizes topics, extracts entities,
        infers sentiment, and suggests follow-up actions before persisting to DB.

        Args:
            hcp_id: ID of the Healthcare Professional as a string number e.g. 1
            interaction_type: Type (Meeting/Call/Email/Conference/Virtual)
            date: ISO date string (YYYY-MM-DD)
            topics_discussed: Free-text description of what was discussed
            outcomes: Key outcomes or agreements reached
            sentiment: Observed sentiment (positive/neutral/negative)
            attendees: Comma-separated list of attendee names
            materials_shared: Comma-separated materials
            samples_distributed: JSON string of sample objects
            follow_up_actions: Next steps or tasks
        """
        try:
            hcp_id_int = int(hcp_id)

            # Use LLM for summarization & entity extraction
            llm = ChatGroq(api_key=GROQ_API_KEY, model_name=PRIMARY_MODEL)
            summary_prompt = f"""
You are a life science CRM assistant. Summarize this HCP interaction concisely in 2-3 sentences.
Extract key entities: products mentioned, concerns raised, commitments made.
Also suggest 3 specific follow-up actions.

Topics: {topics_discussed}
Outcomes: {outcomes}
Sentiment: {sentiment}

Respond ONLY as JSON with no extra text:
{{
  "summary": "...",
  "entities": {{"products": [], "concerns": [], "commitments": []}},
  "suggested_followups": ["...", "...", "..."]
}}
"""
            ai_response = llm.invoke([HumanMessage(content=summary_prompt)])
            try:
                content = ai_response.content.strip()
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                ai_data = json.loads(content)
            except Exception:
                ai_data = {
                    "summary": ai_response.content[:500],
                    "entities": {},
                    "suggested_followups": [follow_up_actions] if follow_up_actions else []
                }

            # Parse attendees & materials
            attendees_list = [a.strip() for a in attendees.split(",") if a.strip()]
            materials_list = [m.strip() for m in materials_shared.split(",") if m.strip()]
            try:
                samples_list = json.loads(samples_distributed) if samples_distributed else []
            except Exception:
                samples_list = []

            # Parse date
            try:
                parsed_date = datetime.fromisoformat(date)
            except Exception:
                parsed_date = datetime.now()

            # Persist to DB
            interaction = Interaction(
                hcp_id=hcp_id_int,
                interaction_type=interaction_type,
                date=parsed_date,
                attendees=attendees_list,
                topics_discussed=topics_discussed,
                materials_shared=materials_list,
                samples_distributed=samples_list,
                sentiment=sentiment,
                outcomes=outcomes,
                follow_up_actions=follow_up_actions,
                ai_summary=ai_data.get("summary", ""),
                ai_suggested_followups=ai_data.get("suggested_followups", []),
            )
            db.add(interaction)
            db.commit()
            db.refresh(interaction)

            return {
                "success": True,
                "interaction_id": interaction.id,
                "ai_summary": ai_data.get("summary"),
                "suggested_followups": ai_data.get("suggested_followups", []),
                "message": f"Interaction #{interaction.id} logged successfully for HCP {hcp_id_int}."
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def edit_interaction(
        interaction_id: str,
        field: str,
        new_value: str
    ) -> dict:
        """
        Tool 2 - Edit Interaction.
        Modifies a specific field of an already-logged interaction.
        Allowed fields: interaction_type, topics_discussed, outcomes,
                        follow_up_actions, sentiment, attendees, materials_shared.

        Args:
            interaction_id: ID of the interaction to edit as string e.g. 1
            field: The field name to update
            new_value: The new value
        """
        try:
            interaction_id_int = int(interaction_id)
            interaction = db.query(Interaction).filter(Interaction.id == interaction_id_int).first()
            if not interaction:
                return {"success": False, "error": f"Interaction {interaction_id_int} not found."}

            allowed_fields = [
                "interaction_type", "topics_discussed", "outcomes",
                "follow_up_actions", "sentiment", "attendees", "materials_shared"
            ]
            if field not in allowed_fields:
                return {"success": False, "error": f"Field '{field}' is not editable. Allowed: {allowed_fields}"}

            if field in ["attendees", "materials_shared"]:
                try:
                    parsed = json.loads(new_value)
                except Exception:
                    parsed = [v.strip() for v in new_value.split(",") if v.strip()]
                setattr(interaction, field, parsed)
            else:
                setattr(interaction, field, new_value)

            # Re-summarize if key fields changed
            if field in ["topics_discussed", "outcomes"]:
                llm = ChatGroq(api_key=GROQ_API_KEY, model_name=PRIMARY_MODEL)
                re_summary = llm.invoke([HumanMessage(content=
                    f"Summarize this updated HCP interaction in 2 sentences:\n"
                    f"Topics: {interaction.topics_discussed}\nOutcomes: {interaction.outcomes}"
                )])
                interaction.ai_summary = re_summary.content[:500]

            interaction.updated_at = datetime.now()
            db.commit()
            db.refresh(interaction)

            return {
                "success": True,
                "interaction_id": interaction_id_int,
                "updated_field": field,
                "new_value": new_value,
                "message": f"Interaction #{interaction_id_int} updated: {field} = {new_value}"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def search_hcp(query: str) -> dict:
        """
        Tool 3 - Search HCP.
        Searches the HCP database by name, specialty, institution, or territory.

        Args:
            query: Search term (name, specialty, or institution)
        """
        try:
            hcps = db.query(HCP).filter(
                HCP.name.ilike(f"%{query}%") |
                HCP.specialty.ilike(f"%{query}%") |
                HCP.institution.ilike(f"%{query}%") |
                HCP.territory.ilike(f"%{query}%")
            ).limit(10).all()

            results = [
                {
                    "id": h.id,
                    "name": h.name,
                    "specialty": h.specialty,
                    "institution": h.institution,
                    "territory": h.territory,
                    "email": h.email
                }
                for h in hcps
            ]
            return {
                "success": True,
                "count": len(results),
                "hcps": results
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def get_interaction_history(hcp_id: str, limit: str = "5") -> dict:
        """
        Tool 4 - Get Interaction History.
        Retrieves the recent interaction history for a specific HCP.

        Args:
            hcp_id: The HCP ID as string e.g. 1
            limit: Number of recent interactions to retrieve default 5
        """
        try:
            hcp_id_int = int(hcp_id)
            limit_int = int(limit)

            hcp = db.query(HCP).filter(HCP.id == hcp_id_int).first()
            if not hcp:
                return {"success": False, "error": f"HCP {hcp_id_int} not found."}

            interactions = (
                db.query(Interaction)
                .filter(Interaction.hcp_id == hcp_id_int)
                .order_by(Interaction.date.desc())
                .limit(limit_int)
                .all()
            )

            history = [
                {
                    "id": i.id,
                    "type": i.interaction_type,
                    "date": i.date.isoformat() if i.date else None,
                    "topics": i.topics_discussed,
                    "outcomes": i.outcomes,
                    "sentiment": i.sentiment,
                    "ai_summary": i.ai_summary,
                    "follow_up_actions": i.follow_up_actions
                }
                for i in interactions
            ]

            return {
                "success": True,
                "hcp_name": hcp.name,
                "hcp_specialty": hcp.specialty,
                "total_interactions": len(history),
                "interactions": history
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @tool
    def suggest_followups(hcp_id: str, context: str = "") -> dict:
        """
        Tool 5 - Suggest Follow-ups.
        Uses the LLM to generate personalized follow-up recommendations
        for an HCP based on their interaction history.

        Args:
            hcp_id: The HCP ID as string e.g. 1
            context: Optional additional context
        """
        try:
            hcp_id_int = int(hcp_id)
            hcp = db.query(HCP).filter(HCP.id == hcp_id_int).first()
            if not hcp:
                return {"success": False, "error": f"HCP {hcp_id_int} not found."}

            recent = (
                db.query(Interaction)
                .filter(Interaction.hcp_id == hcp_id_int)
                .order_by(Interaction.date.desc())
                .limit(3)
                .all()
            )

            history_text = "\n".join([
                f"- [{i.date.strftime('%Y-%m-%d')}] {i.interaction_type}: {i.ai_summary or i.topics_discussed}"
                for i in recent
            ]) or "No previous interactions."

            llm = ChatGroq(api_key=GROQ_API_KEY, model_name=FALLBACK_MODEL)
            prompt = f"""
You are a life science field representative AI assistant.
Based on this HCP profile and recent interactions, suggest 5 specific actionable follow-up actions.

HCP: {hcp.name} | Specialty: {hcp.specialty} | Institution: {hcp.institution}
Recent History:
{history_text}
Additional Context: {context or 'None'}

Focus on: clinical data sharing, sample programs, advisory board invites, upcoming conferences, product updates.
Return ONLY as JSON with no extra text:
{{"suggestions": ["...", "...", "...", "...", "..."], "priority": "high/medium/low", "next_visit_topic": "..."}}
"""
            response = llm.invoke([HumanMessage(content=prompt)])
            try:
                content = response.content.strip()
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                data = json.loads(content)
            except Exception:
                data = {
                    "suggestions": [response.content[:300]],
                    "priority": "medium",
                    "next_visit_topic": "General follow-up"
                }

            return {
                "success": True,
                "hcp_name": hcp.name,
                "suggestions": data.get("suggestions", []),
                "priority": data.get("priority", "medium"),
                "next_visit_topic": data.get("next_visit_topic", ""),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    return [log_interaction, edit_interaction, search_hcp, get_interaction_history, suggest_followups]


# ─────────────────────────────────────────────
# LangGraph Agent Builder
# ─────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI assistant for a Life Sciences CRM system, helping field representatives manage their HCP (Healthcare Professional) interactions.

You have access to 5 tools:
1. log_interaction - Log a new interaction with an HCP (always summarize with AI)
2. edit_interaction - Edit/correct any field of an existing logged interaction
3. search_hcp - Find HCPs by name, specialty, institution, or territory
4. get_interaction_history - Retrieve past interactions for an HCP
5. suggest_followups - Generate AI-powered follow-up recommendations

IMPORTANT: When using tools that require hcp_id or interaction_id, always pass them as string numbers like "1", "2" etc.
Always be concise, professional, and helpful.
Today's date: {today}
"""


def build_agent(db: Session):
    tools = make_tools(db)
    llm = ChatGroq(api_key=GROQ_API_KEY, model_name=PRIMARY_MODEL)
    llm_with_tools = llm.bind_tools(tools)
    tool_node = ToolNode(tools)

    def agent_node(state: AgentState):
        messages = state["messages"]
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [
                SystemMessage(content=SYSTEM_PROMPT.format(today=datetime.now().strftime("%Y-%m-%d")))
            ] + messages
        response = llm_with_tools.invoke(messages)
        return {"messages": [response], "last_action": "agent_response"}

    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    return graph.compile()


# ─────────────────────────────────────────────
# Session Manager
# ─────────────────────────────────────────────

class AgentSessionManager:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_session(self, session_id: str) -> AgentSession:
        session = self.db.query(AgentSession).filter(
            AgentSession.session_id == session_id
        ).first()
        if not session:
            session = AgentSession(session_id=session_id, messages=[], state={})
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
        return session

    def save_session(self, session_id: str, messages: list, state: dict):
        session = self.get_or_create_session(session_id)
        session.messages = [
            {"role": m.type, "content": m.content if hasattr(m, "content") else str(m)}
            for m in messages
            if hasattr(m, "type")
        ]
        session.state = state
        session.updated_at = datetime.now()
        self.db.commit()

    async def chat(self, session_id: str, user_message: str, hcp_id: Optional[int] = None) -> dict:
        agent = build_agent(self.db)
        session = self.get_or_create_session(session_id)

        history = []
        for m in (session.messages or []):
            role = m.get("role", "human")
            content = m.get("content", "")
            if role == "human":
                history.append(HumanMessage(content=content))
            elif role == "ai":
                history.append(AIMessage(content=content))

        history.append(HumanMessage(content=user_message))

        initial_state: AgentState = {
            "messages": history,
            "session_id": session_id,
            "hcp_id": hcp_id,
            "last_action": None,
            "interaction_draft": None,
            "db_session": self.db,
        }

        result = await agent.ainvoke(initial_state)
        final_messages = result["messages"]

        last_ai = next(
            (m for m in reversed(final_messages) if isinstance(m, AIMessage)),
            None
        )
        response_text = last_ai.content if last_ai else "I could not process that request."

        interaction_id = None
        action_taken = result.get("last_action")
        for m in reversed(final_messages):
            if isinstance(m, ToolMessage):
                try:
                    data = json.loads(m.content)
                    if data.get("interaction_id"):
                        interaction_id = data["interaction_id"]
                except Exception:
                    pass
                break

        self.save_session(session_id, final_messages, {
            "hcp_id": hcp_id,
            "last_action": action_taken
        })

        return {
            "session_id": session_id,
            "response": response_text,
            "action_taken": action_taken,
            "interaction_id": interaction_id,
        }
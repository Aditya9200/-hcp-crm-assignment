# 🏥 HCP CRM — AI-First Healthcare Professional Interaction Manager

> An AI-powered CRM system for Life Sciences field representatives to log, manage, and analyze interactions with Healthcare Professionals using LangGraph, Groq LLMs, React, and FastAPI.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [LangGraph Agent & Tools](#langgraph-agent--tools)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)

---

## Overview

This system allows pharmaceutical field representatives to log HCP interactions in two ways:
1. **Structured Form** — Fill in fields for HCP, date, type, topics, sentiment, outcomes, etc.
2. **AI Chat Interface** — Describe the interaction conversationally; the AI agent extracts and logs it automatically.

The LangGraph agent acts as an intelligent middleware that processes natural language, uses tools to interact with the database, and returns structured responses with AI-generated summaries and follow-up recommendations.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)             │
│   ┌─────────────────┐      ┌───────────────────────────┐  │
│   │  Structured Form │      │   AI Chat Interface       │  │
│   │  (Redux + Forms) │      │   (Redux + WebSocket)     │  │
│   └────────┬─────────┘      └───────────┬───────────────┘  │
└────────────┼──────────────────────────┼──────────────────┘
             │ REST API                  │ REST API
             ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Port 8000)              │
│                                                          │
│   /api/interactions   /api/hcp    /api/agent/chat        │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │              LangGraph Agent                    │    │
│   │                                                 │    │
│   │  ┌──────┐    ┌──────────────┐    ┌──────────┐  │    │
│   │  │ User │───▶│  Agent Node  │───▶│ Tool Node│  │    │
│   │  │ Msg  │    │ (Gemma2-9b) │    │          │  │    │
│   │  └──────┘    └──────┬───────┘    └────┬─────┘  │    │
│   │                     │  ◀─────────────┘         │    │
│   │                     ▼                           │    │
│   │              5 Defined Tools                    │    │
│   │   log_interaction | edit_interaction            │    │
│   │   search_hcp | get_history | suggest_followups  │    │
│   └────────────────────────────────────────────────┘    │
│                          │                               │
│                    SQLAlchemy ORM                        │
└──────────────────────────┼───────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)             │
│         hcps | interactions | agent_sessions             │
└──────────────────────────────────────────────────────────┘
                           │
                    Groq API (Cloud)
              gemma2-9b-it / llama-3.3-70b-versatile
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Redux Toolkit, Lucide Icons |
| Styling | CSS3, Google Inter Font |
| State Management | Redux Toolkit (RTK) |
| Backend | Python 3.12, FastAPI |
| AI Agent | LangGraph 0.2.x |
| LLM | Groq — `gemma2-9b-it` (primary), `llama-3.3-70b-versatile` (fallback) |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Containerization | Docker + Docker Compose |

---

## LangGraph Agent & Tools

### Agent Role
The LangGraph agent acts as an intelligent orchestrator for HCP interaction management. It:
- Receives natural language input from the field rep
- Decides which tools to invoke based on intent
- Loops through tool calls until the task is complete
- Returns a human-readable response with structured data

### Agent State Graph
```
[START] → [Agent Node] → conditional edge
                           ├─ has tool_calls → [Tool Node] → [Agent Node] (loop)
                           └─ no tool_calls → [END]
```

### Tool 1: `log_interaction`
**Purpose:** Captures a new HCP interaction and uses the LLM to:
- Summarize the interaction in 2–3 sentences
- Extract key entities (products, concerns, commitments)
- Suggest 3 follow-up actions

**Parameters:** `hcp_id`, `interaction_type`, `date`, `topics_discussed`, `outcomes`, `sentiment`, `attendees`, `materials_shared`, `samples_distributed`, `follow_up_actions`

**LLM Role:** After receiving raw input, it sends a structured prompt to `gemma2-9b-it` which returns:
```json
{
  "summary": "...",
  "entities": { "products": [], "concerns": [], "commitments": [] },
  "suggested_followups": ["...", "...", "..."]
}
```
The result is saved to `interactions` table along with the AI-generated fields.

---

### Tool 2: `edit_interaction`
**Purpose:** Modifies specific fields of an already-logged interaction.

**Parameters:** `interaction_id`, `field` (allowed: interaction_type, topics_discussed, outcomes, follow_up_actions, sentiment, attendees, materials_shared), `new_value`

**Smart Re-summarization:** If `topics_discussed` or `outcomes` is edited, the agent automatically re-generates the AI summary using the LLM.

---

### Tool 3: `search_hcp`
**Purpose:** Searches the HCP database using fuzzy matching on name, specialty, institution, or territory.

**Parameters:** `query` (search string)

**Returns:** List of matching HCPs with id, name, specialty, institution, territory.

---

### Tool 4: `get_interaction_history`
**Purpose:** Retrieves recent interaction history for a specific HCP — useful for context before a new visit.

**Parameters:** `hcp_id`, `limit` (default: 5)

**Returns:** Chronological list of interactions with AI summaries, sentiments, and follow-up actions.

---

### Tool 5: `suggest_followups`
**Purpose:** Uses `llama-3.3-70b-versatile` to generate 5 personalized follow-up recommendations based on the HCP's profile and interaction history.

**Parameters:** `hcp_id`, `context` (optional additional context)

**Returns:** 5 specific suggestions, priority level, and recommended topic for next visit.

---

## Database Schema

### Table: `hcps`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment |
| name | VARCHAR(255) | Full name |
| specialty | VARCHAR(255) | Medical specialty |
| institution | VARCHAR(255) | Hospital/clinic |
| email | VARCHAR(255) UNIQUE | Contact email |
| phone | VARCHAR(50) | Phone number |
| territory | VARCHAR(100) | Sales territory |
| created_at | TIMESTAMPTZ | Record creation time |

### Table: `interactions`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment |
| hcp_id | INTEGER FK | Reference to HCPs |
| interaction_type | VARCHAR(50) | Meeting/Call/Email/Conference/Virtual |
| date | TIMESTAMPTZ | Date and time of interaction |
| attendees | JSONB | List of attendee names |
| topics_discussed | TEXT | Free-text discussion notes |
| materials_shared | JSONB | List of shared materials |
| samples_distributed | JSONB | Array of {product, quantity} objects |
| sentiment | VARCHAR(20) | positive/neutral/negative |
| outcomes | TEXT | Key agreements or outcomes |
| follow_up_actions | TEXT | Next steps |
| ai_summary | TEXT | LLM-generated summary |
| ai_suggested_followups | JSONB | LLM-generated follow-ups |
| raw_chat_log | TEXT | Original chat conversation |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last modification |

### Table: `agent_sessions`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment |
| session_id | VARCHAR(255) UNIQUE | UUID session identifier |
| hcp_id | INTEGER FK | Optional HCP context |
| messages | JSONB | Full message history |
| state | JSONB | Agent state snapshot |
| created_at | TIMESTAMPTZ | Session start |
| updated_at | TIMESTAMPTZ | Last activity |

---

## Setup & Installation

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16 (or Docker)
- Groq API Key → [console.groq.com](https://console.groq.com)

### Option A: Docker (Recommended)
```bash
# 1. Clone the repo
git clone <your-repo-url>
cd hcp-crm

# 2. Set environment variables
echo "GROQ_API_KEY=your_key_here" > .env

# 3. Start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option B: Manual Setup

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env: add GROQ_API_KEY and DATABASE_URL

# Initialize database
psql -U postgres -f schema.sql

# Run server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Set environment
cp .env.example .env

# Start dev server
npm start
```

---

## API Reference

### Interactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interactions/` | List all interactions |
| POST | `/api/interactions/` | Create interaction |
| GET | `/api/interactions/{id}` | Get single interaction |
| PATCH | `/api/interactions/{id}` | Update interaction |
| DELETE | `/api/interactions/{id}` | Delete interaction |

### HCPs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hcp/` | List HCPs (with optional `?search=`) |
| POST | `/api/hcp/` | Create HCP |
| GET | `/api/hcp/{id}` | Get single HCP |
| PUT | `/api/hcp/{id}` | Update HCP |

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/chat` | Send message to LangGraph agent |
| POST | `/api/agent/session/new` | Create new session |
| GET | `/api/agent/session/{id}` | Get session history |

**Chat Request Body:**
```json
{
  "session_id": "uuid-string",
  "message": "Met Dr. Sharma today, discussed Oncovibe efficacy, she was positive",
  "hcp_id": 1
}
```

---

## Project Structure

```
hcp-crm/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── schema.sql
│   └── app/
│       ├── main.py                  # FastAPI app entry
│       ├── agents/
│       │   └── hcp_agent.py         # LangGraph agent + 5 tools
│       ├── models/
│       │   └── models.py            # SQLAlchemy ORM models
│       ├── schemas/
│       │   └── schemas.py           # Pydantic request/response schemas
│       ├── routers/
│       │   ├── interactions.py      # Interactions CRUD
│       │   ├── hcp.py               # HCP CRUD
│       │   └── agent.py             # Agent chat endpoints
│       └── database/
│           └── connection.py        # DB engine & session
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.js                   # Root component + layout
        ├── index.js
        ├── store/
        │   ├── index.js             # Redux store
        │   └── slices/
        │       ├── interactionsSlice.js
        │       ├── agentSlice.js
        │       └── hcpSlice.js
        ├── components/
        │   ├── form/
        │   │   └── LogInteractionForm.js    # Structured form UI
        │   ├── chat/
        │   │   └── ChatInterface.js         # AI chat UI
        │   └── shared/
        │       └── InteractionsList.js      # History view
        ├── services/
        │   └── api.js               # Axios instance
        └── styles/
            └── global.css           # All CSS styles
```

---

## Key Design Decisions

1. **Dual Input Mode** — Both form and chat produce identical data models; the agent tool `log_interaction` handles the chat path while the REST API handles the form path.

2. **LLM for Summarization** — Every logged interaction is enriched by `gemma2-9b-it` before saving, reducing manual effort for field reps.

3. **Session Persistence** — Agent sessions are stored in PostgreSQL, enabling conversation continuity across page refreshes.

4. **Tool-First Architecture** — LangGraph's `ToolNode` ensures the agent can handle multi-step tasks (e.g., search HCP → check history → log interaction) in a single conversation turn.

5. **Sentiment Inference** — The LLM infers HCP sentiment from the conversation text, pre-filling the sentiment field with AI confidence.

-- HCP CRM Database Schema
-- Run this to initialize the database

CREATE DATABASE IF NOT EXISTS hcp_crm;
\c hcp_crm;

-- HCPs (Healthcare Professionals)
CREATE TABLE IF NOT EXISTS hcps (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    specialty   VARCHAR(255),
    institution VARCHAR(255),
    email       VARCHAR(255) UNIQUE,
    phone       VARCHAR(50),
    territory   VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions
CREATE TABLE IF NOT EXISTS interactions (
    id                    SERIAL PRIMARY KEY,
    hcp_id                INTEGER NOT NULL REFERENCES hcps(id) ON DELETE CASCADE,
    interaction_type      VARCHAR(50) NOT NULL CHECK (interaction_type IN ('Meeting','Call','Email','Conference','Virtual')),
    date                  TIMESTAMPTZ NOT NULL,
    attendees             JSONB DEFAULT '[]',
    topics_discussed      TEXT,
    materials_shared      JSONB DEFAULT '[]',
    samples_distributed   JSONB DEFAULT '[]',
    sentiment             VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')),
    outcomes              TEXT,
    follow_up_actions     TEXT,
    ai_summary            TEXT,
    ai_suggested_followups JSONB DEFAULT '[]',
    raw_chat_log          TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ
);

-- Agent Sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(255) UNIQUE NOT NULL,
    hcp_id      INTEGER REFERENCES hcps(id) ON DELETE SET NULL,
    messages    JSONB DEFAULT '[]',
    state       JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_hcp_id ON interactions(hcp_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_hcps_name ON hcps(name);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_session_id ON agent_sessions(session_id);

-- Sample HCP Seed Data
INSERT INTO hcps (name, specialty, institution, email, territory) VALUES
  ('Dr. Priya Sharma',   'Oncology',     'Apollo Hospital Mumbai',        'priya.sharma@apollo.com',   'Mumbai'),
  ('Dr. Rahul Mehta',    'Cardiology',   'Fortis Hospital Delhi',         'rahul.mehta@fortis.com',    'Delhi'),
  ('Dr. Ananya Iyer',    'Neurology',    'AIIMS Bangalore',               'ananya.iyer@aiims.com',     'Bangalore'),
  ('Dr. Suresh Pillai',  'Endocrinology','Manipal Hospital Kochi',        'suresh.pillai@manipal.com', 'Kochi'),
  ('Dr. Kavita Singh',   'Hematology',   'Tata Memorial Centre Mumbai',   'kavita.singh@tata.com',     'Mumbai')
ON CONFLICT (email) DO NOTHING;

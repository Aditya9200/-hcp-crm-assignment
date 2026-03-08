from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interactions, hcp, agent
from app.database.connection import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HCP CRM API",
    description="AI-First CRM for Healthcare Professionals",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(hcp.router, prefix="/api/hcp", tags=["HCP"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])

@app.get("/")
def root():
    return {"message": "HCP CRM API is running"}

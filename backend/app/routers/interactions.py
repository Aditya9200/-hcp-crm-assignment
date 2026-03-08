from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.models import Interaction, HCP
from app.schemas.schemas import (
    InteractionCreate, InteractionUpdate, InteractionResponse
)

router = APIRouter()


@router.post("/", response_model=InteractionResponse)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == payload.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    interaction = Interaction(**payload.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.get("/", response_model=List[InteractionResponse])
def list_interactions(
    hcp_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(Interaction)
    if hcp_id:
        query = query.filter(Interaction.hcp_id == hcp_id)
    return query.order_by(Interaction.date.desc()).offset(skip).limit(limit).all()


@router.get("/{interaction_id}", response_model=InteractionResponse)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.patch("/{interaction_id}", response_model=InteractionResponse)
def update_interaction(
    interaction_id: int,
    payload: InteractionUpdate,
    db: Session = Depends(get_db)
):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(interaction, key, value)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.delete("/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
    return {"message": f"Interaction {interaction_id} deleted"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.models import HCP
from app.schemas.schemas import HCPCreate, HCPResponse

router = APIRouter()


@router.post("/", response_model=HCPResponse)
def create_hcp(payload: HCPCreate, db: Session = Depends(get_db)):
    existing = db.query(HCP).filter(HCP.email == payload.email).first() if payload.email else None
    if existing:
        raise HTTPException(status_code=400, detail="HCP with this email already exists")
    hcp = HCP(**payload.model_dump())
    db.add(hcp)
    db.commit()
    db.refresh(hcp)
    return hcp


@router.get("/", response_model=List[HCPResponse])
def list_hcps(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(HCP)
    if search:
        query = query.filter(
            HCP.name.ilike(f"%{search}%") |
            HCP.specialty.ilike(f"%{search}%") |
            HCP.institution.ilike(f"%{search}%")
        )
    return query.offset(skip).limit(limit).all()


@router.get("/{hcp_id}", response_model=HCPResponse)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.put("/{hcp_id}", response_model=HCPResponse)
def update_hcp(hcp_id: int, payload: HCPCreate, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    for key, value in payload.model_dump().items():
        setattr(hcp, key, value)
    db.commit()
    db.refresh(hcp)
    return hcp

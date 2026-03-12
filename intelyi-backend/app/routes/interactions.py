from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Interaction
from ..schemas import InteractionCreate, InteractionOut

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    interaction = Interaction(
        product_id=payload.product_id,
        user_id=payload.user_id,
        session_id=payload.session_id,
        event_type=payload.event_type,
        event_value=payload.event_value,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction

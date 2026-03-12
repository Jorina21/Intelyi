from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Interaction, Product
from ..schemas import RecommendedProductOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[RecommendedProductOut])
def list_recommendations(db: Session = Depends(get_db)):
    score_expression = func.coalesce(
        func.sum(
            case(
                (Interaction.event_type == "view", 1),
                (Interaction.event_type == "click", 3),
                else_=0,
            )
        ),
        0,
    )

    rows = db.execute(
        select(
            Product.id,
            Product.name,
            Product.description,
            Product.price_cents,
            Product.status,
            score_expression.label("score"),
        )
        .outerjoin(Interaction, Interaction.product_id == Product.id)
        .group_by(
            Product.id,
            Product.name,
            Product.description,
            Product.price_cents,
            Product.status,
        )
        .order_by(score_expression.desc(), Product.created_at.desc())
    ).all()

    return [
        RecommendedProductOut(
            id=row.id,
            name=row.name,
            description=row.description,
            price_cents=row.price_cents,
            status=row.status,
            score=row.score,
        )
        for row in rows
    ]

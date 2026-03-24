from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, literal, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Interaction, Product
from ..schemas import RecommendedProductOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def weighted_score_expression():
    return func.coalesce(
        func.sum(
            case(
                (Interaction.event_type == "view", 1),
                (Interaction.event_type == "click", 3),
                (Interaction.event_type == "add_to_cart", 8),
                (Interaction.event_type == "purchase", 20),
                else_=0,
            )
        ),
        0,
    )


@router.get("", response_model=list[RecommendedProductOut])
def list_recommendations(
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
):
    global_scores = (
        select(
            Interaction.product_id.label("product_id"),
            weighted_score_expression().label("global_score"),
        )
        .group_by(Interaction.product_id)
        .subquery()
    )

    visitor_filter = None
    if user_id:
        visitor_filter = Interaction.user_id == user_id
    elif session_id:
        visitor_filter = Interaction.session_id == session_id

    personal_score_column = literal(0)
    stmt = (
        select(
            Product.id,
            Product.name,
            Product.description,
            Product.price_cents,
            Product.status,
            func.coalesce(global_scores.c.global_score, 0).label("global_score"),
        )
        .outerjoin(global_scores, global_scores.c.product_id == Product.id)
        .where(Product.status == "ACTIVE")
    )

    if visitor_filter is not None:
        personal_scores = (
            select(
                Interaction.product_id.label("product_id"),
                weighted_score_expression().label("personal_score"),
            )
            .where(visitor_filter)
            .group_by(Interaction.product_id)
            .subquery()
        )
        stmt = stmt.outerjoin(personal_scores, personal_scores.c.product_id == Product.id)
        personal_score_column = func.coalesce(personal_scores.c.personal_score, 0)

    global_score_column = func.coalesce(global_scores.c.global_score, 0)
    final_score_column = (personal_score_column * 3) + global_score_column

    stmt = (
        stmt.add_columns(
            personal_score_column.label("personal_score"),
            final_score_column.label("score"),
        )
        .order_by(final_score_column.desc(), Product.created_at.desc())
    )

    if limit is not None:
        stmt = stmt.limit(limit)

    rows = db.execute(stmt).all()

    return [
        RecommendedProductOut(
            id=row.id,
            name=row.name,
            description=row.description,
            price_cents=row.price_cents,
            status=row.status,
            score=row.score,
            personal_score=row.personal_score,
            global_score=row.global_score,
        )
        for row in rows
    ]

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Interaction, Product
from ..schemas import ProductAnalyticsOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/products", response_model=list[ProductAnalyticsOut])
def list_product_analytics(db: Session = Depends(get_db)):
    views_expression = func.coalesce(
        func.sum(case((Interaction.event_type == "view", 1), else_=0)),
        0,
    )
    clicks_expression = func.coalesce(
        func.sum(case((Interaction.event_type == "click", 1), else_=0)),
        0,
    )
    add_to_cart_expression = func.coalesce(
        func.sum(case((Interaction.event_type == "add_to_cart", 1), else_=0)),
        0,
    )
    purchases_expression = func.coalesce(
        func.sum(case((Interaction.event_type == "purchase", 1), else_=0)),
        0,
    )
    score_expression = (
        views_expression
        + (clicks_expression * 3)
        + (add_to_cart_expression * 8)
        + (purchases_expression * 20)
    )
    ctr_expression = case(
        (views_expression > 0, clicks_expression * 1.0 / views_expression),
        else_=0.0,
    )

    rows = db.execute(
        select(
            Product.id.label("product_id"),
            Product.name,
            views_expression.label("views"),
            clicks_expression.label("clicks"),
            add_to_cart_expression.label("add_to_cart"),
            purchases_expression.label("purchases"),
            score_expression.label("score"),
            ctr_expression.label("ctr"),
        )
        .outerjoin(Interaction, Interaction.product_id == Product.id)
        .where(Product.status == "ACTIVE")
        .group_by(Product.id, Product.name, Product.created_at)
        .order_by(score_expression.desc(), Product.created_at.desc())
    ).all()

    return [
        ProductAnalyticsOut(
            product_id=row.product_id,
            name=row.name,
            views=row.views,
            clicks=row.clicks,
            add_to_cart=row.add_to_cart,
            purchases=row.purchases,
            score=row.score,
            ctr=float(row.ctr),
        )
        for row in rows
    ]

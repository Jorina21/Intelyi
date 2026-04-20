from collections import Counter, defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Interaction, Product
from ..schemas import RecommendedProductOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


EVENT_WEIGHTS = {
    "view": 1.0,
    "click": 3.0,
    "add_to_cart": 8.0,
    "purchase": 20.0,
}


def get_event_weight(event_type: str) -> float:
    return EVENT_WEIGHTS.get(event_type, 0.0)


def get_recency_multiplier(created_at: datetime | None, now: datetime) -> float:
    if created_at is None:
        return 0.25

    timestamp = created_at
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    age_days = max((now - timestamp).total_seconds() / 86400, 0)

    if age_days <= 3:
        return 1.0
    if age_days <= 14:
        return 0.75
    if age_days <= 45:
        return 0.45
    return 0.2


def score_interaction(interaction: Interaction, now: datetime) -> float:
    return get_event_weight(interaction.event_type) * get_recency_multiplier(interaction.created_at, now)


def build_reason_summary(
    category_boost: int,
    personal_score: int,
    repeat_penalty: int,
    diversity_penalty: int,
    global_score: int,
) -> str:
    if category_boost >= 10:
        return "Recommended because this category has been strong in recent activity."
    if repeat_penalty >= 12:
        return "Recommended with repeat suppression so fresher options can surface."
    if diversity_penalty >= 6:
        return "Recommended to keep the shelf relevant without collapsing into one category."
    if personal_score > global_score:
        return "Recommended from recent personal browsing signals."
    return "Recommended from overall storefront demand and recent shopper activity."


@router.get("", response_model=list[RecommendedProductOut])
def list_recommendations(
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int | None = Query(default=None, ge=1),
    debug: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    active_products = db.execute(
        select(Product).where(Product.status == "ACTIVE").order_by(Product.created_at.desc())
    ).scalars().all()

    if not active_products:
        return []

    interactions = db.execute(select(Interaction)).scalars().all()

    global_scores_by_product: dict[str, float] = defaultdict(float)
    personal_scores_by_product: dict[str, float] = defaultdict(float)
    personal_interaction_counts: dict[str, int] = defaultdict(int)
    personal_category_affinity: dict[str, float] = defaultdict(float)

    for interaction in interactions:
        interaction_score = score_interaction(interaction, now)
        global_scores_by_product[interaction.product_id] += interaction_score

        matches_visitor = False
        if user_id:
            matches_visitor = interaction.user_id == user_id
        elif session_id:
            matches_visitor = interaction.session_id == session_id

        if not matches_visitor:
            continue

        personal_scores_by_product[interaction.product_id] += interaction_score
        personal_interaction_counts[interaction.product_id] += 1

    products_by_id = {product.id: product for product in active_products}
    for product_id, score in personal_scores_by_product.items():
        category = products_by_id.get(product_id).category if product_id in products_by_id else None
        if category:
            personal_category_affinity[category] += score

    max_category_affinity = max(personal_category_affinity.values(), default=0.0)
    ranked_candidates: list[dict] = []

    for product in active_products:
        global_score = int(round(global_scores_by_product.get(product.id, 0.0)))
        personal_score = int(round(personal_scores_by_product.get(product.id, 0.0)))

        category_boost = 0
        if product.category and max_category_affinity > 0:
            category_boost = int(
                round((personal_category_affinity.get(product.category, 0.0) / max_category_affinity) * 18)
            )

        repeat_penalty = 0
        repeat_count = personal_interaction_counts.get(product.id, 0)
        if repeat_count > 0:
            repeat_penalty = min(28, int(round(personal_scores_by_product[product.id] * 0.7)) + (repeat_count * 2))

        base_score = global_score + (personal_score * 2) + category_boost - repeat_penalty
        ranked_candidates.append(
            {
                "product": product,
                "global_score": global_score,
                "personal_score": personal_score,
                "category_boost": category_boost,
                "repeat_penalty": repeat_penalty,
                "repeat_count": repeat_count,
                "base_score": base_score,
            }
        )

    ranked_candidates.sort(
        key=lambda candidate: (
            candidate["base_score"],
            candidate["personal_score"],
            candidate["global_score"],
            candidate["product"].created_at,
        ),
        reverse=True,
    )

    category_counts: Counter[str] = Counter()
    remaining_candidates = list(ranked_candidates)
    reranked_candidates: list[dict] = []

    while remaining_candidates:
        best_index = 0
        best_candidate = None
        best_sort_key = None

        for index, candidate in enumerate(remaining_candidates):
            category = candidate["product"].category or "__uncategorized__"
            diversity_penalty = category_counts[category] * 6
            adjusted_score = candidate["base_score"] - diversity_penalty
            sort_key = (
                adjusted_score,
                candidate["base_score"],
                candidate["personal_score"],
                candidate["global_score"],
                candidate["product"].created_at,
            )

            if best_sort_key is None or sort_key > best_sort_key:
                best_index = index
                best_sort_key = sort_key
                best_candidate = candidate

        if best_candidate is None:
            break

        category = best_candidate["product"].category or "__uncategorized__"
        best_candidate["diversity_penalty"] = category_counts[category] * 6
        best_candidate["score"] = best_candidate["base_score"] - best_candidate["diversity_penalty"]
        reranked_candidates.append(best_candidate)
        category_counts[category] += 1
        remaining_candidates.pop(best_index)

    if limit is not None:
        reranked_candidates = reranked_candidates[:limit]

    return [
        RecommendedProductOut(
            id=candidate["product"].id,
            name=candidate["product"].name,
            description=candidate["product"].description,
            image_url=candidate["product"].image_url,
            category=candidate["product"].category,
            brand=candidate["product"].brand,
            price_cents=candidate["product"].price_cents,
            status=candidate["product"].status,
            score=candidate["score"],
            personal_score=candidate["personal_score"],
            global_score=candidate["global_score"],
            recommendation_reason=build_reason_summary(
                category_boost=candidate["category_boost"],
                personal_score=candidate["personal_score"],
                repeat_penalty=candidate["repeat_penalty"],
                diversity_penalty=candidate["diversity_penalty"],
                global_score=candidate["global_score"],
            ),
            debug=(
                {
                    "base_score": candidate["base_score"],
                    "category_boost": candidate["category_boost"],
                    "repeat_penalty": candidate["repeat_penalty"],
                    "repeat_count": candidate["repeat_count"],
                    "diversity_penalty": candidate["diversity_penalty"],
                }
                if debug
                else None
            ),
        )
        for candidate in reranked_candidates
    ]

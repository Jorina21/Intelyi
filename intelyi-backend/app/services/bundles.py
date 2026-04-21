from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Interaction, Product


EVENT_WEIGHTS = {
    "view": 1.0,
    "click": 3.0,
    "add_to_cart": 8.0,
    "purchase": 20.0,
}

CATEGORY_COMPATIBILITY: dict[str, set[str]] = {
    "apparel": {"accessories", "shoes", "bags", "jewelry"},
    "clothing": {"accessories", "shoes", "bags", "jewelry"},
    "tops": {"bottoms", "accessories", "shoes"},
    "bottoms": {"tops", "accessories", "shoes"},
    "dresses": {"accessories", "shoes", "jewelry"},
    "shoes": {"apparel", "clothing", "accessories", "bags"},
    "accessories": {"apparel", "clothing", "shoes", "bags"},
    "beauty": {"skin care", "personal care", "health"},
    "skin care": {"beauty", "personal care", "health"},
    "home": {"kitchen", "decor", "furniture", "storage"},
    "kitchen": {"home", "dining", "storage"},
    "electronics": {"accessories", "audio", "computer accessories"},
    "computers": {"electronics", "computer accessories", "audio"},
    "phone": {"electronics", "accessories"},
}

STOP_WORDS = {
    "a",
    "an",
    "and",
    "for",
    "in",
    "of",
    "on",
    "set",
    "the",
    "to",
    "with",
}


@dataclass
class BundleCandidate:
    product: Product
    score: int
    relationship_score: int
    category_score: int
    brand_score: int
    price_score: int
    popularity_score: int
    duplicate_penalty: int
    diversity_penalty: int
    reason: str


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def text_tokens(*values: str | None) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        tokens.update(
            token
            for token in re.findall(r"[a-z0-9]+", normalize_text(value))
            if len(token) > 2 and token not in STOP_WORDS
        )
    return tokens


def category_parts(category: str | None) -> set[str]:
    normalized = normalize_text(category)
    if not normalized:
        return set()
    parts = re.split(r"[/>&,+-]+|\band\b", normalized)
    return {part.strip() for part in parts if part.strip()}


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
    return EVENT_WEIGHTS.get(interaction.event_type, 0.0) * get_recency_multiplier(interaction.created_at, now)


def get_behavior_scores(db: Session, now: datetime) -> dict[str, float]:
    interactions = db.execute(select(Interaction)).scalars().all()
    scores_by_product: dict[str, float] = defaultdict(float)

    for interaction in interactions:
        scores_by_product[interaction.product_id] += score_interaction(interaction, now)

    return scores_by_product


def get_category_score(anchor: Product, candidate: Product) -> tuple[int, str]:
    anchor_category = normalize_text(anchor.category)
    candidate_category = normalize_text(candidate.category)

    if not anchor_category or not candidate_category:
        return 2, "catalog-adjacent item"

    if candidate_category in CATEGORY_COMPATIBILITY.get(anchor_category, set()):
        return 24, "complementary category"

    if anchor_category in CATEGORY_COMPATIBILITY.get(candidate_category, set()):
        return 24, "complementary category"

    anchor_parts = category_parts(anchor_category)
    candidate_parts = category_parts(candidate_category)

    if anchor_parts and candidate_parts and anchor_parts.intersection(candidate_parts):
        return 14, "related category family"

    if anchor_category == candidate_category:
        return 12, "same category"

    return 4, "catalog breadth"


def get_price_score(anchor: Product, candidate: Product) -> int:
    anchor_price = max(anchor.price_cents, 1)
    candidate_price = max(candidate.price_cents, 0)
    ratio = candidate_price / anchor_price

    if 0.5 <= ratio <= 1.6:
        return 18
    if 0.25 <= ratio < 0.5 or 1.6 < ratio <= 2.5:
        return 10
    if candidate_price <= 2500:
        return 8
    return 2


def get_brand_score(anchor: Product, candidate: Product) -> int:
    anchor_brand = normalize_text(anchor.brand)
    candidate_brand = normalize_text(candidate.brand)

    if not anchor_brand or not candidate_brand:
        return 0
    if anchor_brand == candidate_brand:
        return 8
    return 2


def get_similarity(anchor: Product, candidate: Product) -> float:
    anchor_tokens = text_tokens(anchor.name, anchor.description, anchor.brand)
    candidate_tokens = text_tokens(candidate.name, candidate.description, candidate.brand)

    if not anchor_tokens or not candidate_tokens:
        return 0.0

    return len(anchor_tokens.intersection(candidate_tokens)) / len(anchor_tokens.union(candidate_tokens))


def get_duplicate_penalty(anchor: Product, candidate: Product) -> int:
    similarity = get_similarity(anchor, candidate)
    same_category = normalize_text(anchor.category) == normalize_text(candidate.category)
    same_brand = normalize_text(anchor.brand) and normalize_text(anchor.brand) == normalize_text(candidate.brand)

    if similarity >= 0.72 and same_category:
        return 32
    if similarity >= 0.55 and same_brand:
        return 20
    if similarity >= 0.4 and same_category:
        return 12
    return 0


def get_relationship_score(category_score: int, brand_score: int, price_score: int, duplicate_penalty: int) -> int:
    return max(0, category_score + brand_score + price_score - duplicate_penalty)


def build_reason(
    category_reason: str,
    brand_score: int,
    price_score: int,
    popularity_score: int,
    diversity_penalty: int,
) -> str:
    reasons = [category_reason]

    if price_score >= 18:
        reasons.append("similar price range")
    elif price_score >= 10:
        reasons.append("reasonable price step")

    if brand_score >= 8:
        reasons.append("same brand styling")

    if popularity_score >= 10:
        reasons.append("strong shopper activity")

    if diversity_penalty > 0:
        reasons.append("balanced for bundle variety")

    return "Selected for " + ", ".join(reasons) + "."


def score_bundle_candidate(
    anchor: Product,
    candidate: Product,
    behavior_scores: dict[str, float],
    max_behavior_score: float,
) -> BundleCandidate:
    category_score, category_reason = get_category_score(anchor, candidate)
    brand_score = get_brand_score(anchor, candidate)
    price_score = get_price_score(anchor, candidate)
    duplicate_penalty = get_duplicate_penalty(anchor, candidate)
    popularity_score = (
        int(round((behavior_scores.get(candidate.id, 0.0) / max_behavior_score) * 18))
        if max_behavior_score > 0
        else 0
    )
    relationship_score = get_relationship_score(category_score, brand_score, price_score, duplicate_penalty)
    score = relationship_score + popularity_score

    return BundleCandidate(
        product=candidate,
        score=score,
        relationship_score=relationship_score,
        category_score=category_score,
        brand_score=brand_score,
        price_score=price_score,
        popularity_score=popularity_score,
        duplicate_penalty=duplicate_penalty,
        diversity_penalty=0,
        reason=build_reason(category_reason, brand_score, price_score, popularity_score, 0),
    )


def apply_diversity_rerank(candidates: list[BundleCandidate], limit: int) -> list[BundleCandidate]:
    selected: list[BundleCandidate] = []
    remaining = list(candidates)
    category_counts: Counter[str] = Counter()
    brand_counts: Counter[str] = Counter()

    while remaining and len(selected) < limit:
        best_index = 0
        best_key: tuple[int, int, int, int, str] | None = None

        for index, candidate in enumerate(remaining):
            category = normalize_text(candidate.product.category) or "__uncategorized__"
            brand = normalize_text(candidate.product.brand) or "__unbranded__"
            diversity_penalty = category_counts[category] * 7 + brand_counts[brand] * 4
            adjusted_score = candidate.score - diversity_penalty
            sort_key = (
                adjusted_score,
                candidate.relationship_score,
                candidate.popularity_score,
                candidate.product.price_cents,
                candidate.product.name,
            )

            if best_key is None or sort_key > best_key:
                best_index = index
                best_key = sort_key

        chosen = remaining.pop(best_index)
        category = normalize_text(chosen.product.category) or "__uncategorized__"
        brand = normalize_text(chosen.product.brand) or "__unbranded__"
        chosen.diversity_penalty = category_counts[category] * 7 + brand_counts[brand] * 4
        chosen.score = chosen.score - chosen.diversity_penalty
        chosen.reason = build_reason(
            "complementary category" if chosen.category_score >= 24 else "related merchandising fit",
            chosen.brand_score,
            chosen.price_score,
            chosen.popularity_score,
            chosen.diversity_penalty,
        )
        selected.append(chosen)
        category_counts[category] += 1
        brand_counts[brand] += 1

    return selected


def generate_product_bundle(db: Session, product_id: str, limit: int = 4) -> tuple[Product | None, list[BundleCandidate]]:
    anchor = db.get(Product, product_id)
    if not anchor or anchor.status != "ACTIVE":
        return anchor, []

    now = datetime.now(timezone.utc)
    products = db.execute(
        select(Product)
        .where(Product.status == "ACTIVE", Product.id != product_id)
        .order_by(Product.created_at.desc(), Product.name.asc())
    ).scalars().all()

    if not products:
        return anchor, []

    behavior_scores = get_behavior_scores(db, now)
    max_behavior_score = max(behavior_scores.values(), default=0.0)
    candidates = [
        score_bundle_candidate(anchor, candidate, behavior_scores, max_behavior_score)
        for candidate in products
    ]
    viable_candidates = [candidate for candidate in candidates if candidate.score >= 14]
    viable_candidates.sort(
        key=lambda candidate: (
            candidate.score,
            candidate.relationship_score,
            candidate.popularity_score,
            candidate.product.created_at,
            candidate.product.name,
        ),
        reverse=True,
    )

    return anchor, apply_diversity_rerank(viable_candidates, limit)

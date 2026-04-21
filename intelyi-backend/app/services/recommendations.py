from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Interaction, Product


EVENT_WEIGHTS = {
    "view": 1.0,
    "click": 3.0,
    "add_to_cart": 8.0,
    "purchase": 20.0,
}


@dataclass(frozen=True)
class RecommendationTuningConfig:
    personal_score_weight: float = 2.0
    category_affinity_weight: int = 18
    repeat_score_multiplier: float = 0.7
    repeat_count_weight: int = 2
    repeat_penalty_cap: int = 28
    diversity_penalty_weight: int = 6
    recent_3_day_multiplier: float = 1.0
    recent_14_day_multiplier: float = 0.75
    recent_45_day_multiplier: float = 0.45
    older_multiplier: float = 0.2
    missing_timestamp_multiplier: float = 0.25


@dataclass
class RecommendationCandidate:
    product: Product
    score: int
    baseline_score: int
    baseline_rank: int | None
    current_rank: int | None
    global_score: int
    personal_score: int
    personal_weighted_score: int
    category_boost: int
    repeat_penalty: int
    repeat_count: int
    diversity_penalty: int
    base_score: int
    recommendation_reason: str
    debug: dict[str, int | float | str | None]


@dataclass
class RecommendationEvaluation:
    recommendations: list[RecommendationCandidate]
    baseline_recommendations: list[RecommendationCandidate]
    tuning: RecommendationTuningConfig
    summary: dict[str, int | float | str | list[str]]
    top_drivers: list[dict[str, int | float | str]]
    baseline_comparison: dict[str, int | float | str | list[str]]


def get_recency_multiplier(created_at: datetime | None, now: datetime, tuning: RecommendationTuningConfig) -> float:
    if created_at is None:
        return tuning.missing_timestamp_multiplier

    timestamp = created_at
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    age_days = max((now - timestamp).total_seconds() / 86400, 0)

    if age_days <= 3:
        return tuning.recent_3_day_multiplier
    if age_days <= 14:
        return tuning.recent_14_day_multiplier
    if age_days <= 45:
        return tuning.recent_45_day_multiplier
    return tuning.older_multiplier


def score_interaction(interaction: Interaction, now: datetime, tuning: RecommendationTuningConfig) -> float:
    return EVENT_WEIGHTS.get(interaction.event_type, 0.0) * get_recency_multiplier(interaction.created_at, now, tuning)


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


def matches_visitor(interaction: Interaction, user_id: str | None, session_id: str | None) -> bool:
    if user_id:
        return interaction.user_id == user_id
    if session_id:
        return interaction.session_id == session_id
    return False


def rank_baseline_candidates(
    candidates: list[RecommendationCandidate],
) -> list[RecommendationCandidate]:
    baseline_ranked = sorted(
        candidates,
        key=lambda candidate: (
            candidate.baseline_score,
            candidate.product.created_at,
            candidate.product.name,
        ),
        reverse=True,
    )

    for index, candidate in enumerate(baseline_ranked, start=1):
        candidate.baseline_rank = index

    return baseline_ranked


def apply_diversity_rerank(
    candidates: list[RecommendationCandidate],
    tuning: RecommendationTuningConfig,
) -> list[RecommendationCandidate]:
    category_counts: Counter[str] = Counter()
    remaining_candidates = list(candidates)
    reranked_candidates: list[RecommendationCandidate] = []

    while remaining_candidates:
        best_index = 0
        best_candidate = None
        best_sort_key = None

        for index, candidate in enumerate(remaining_candidates):
            category = candidate.product.category or "__uncategorized__"
            diversity_penalty = category_counts[category] * tuning.diversity_penalty_weight
            adjusted_score = candidate.base_score - diversity_penalty
            sort_key = (
                adjusted_score,
                candidate.base_score,
                candidate.personal_score,
                candidate.global_score,
                candidate.product.created_at,
            )

            if best_sort_key is None or sort_key > best_sort_key:
                best_index = index
                best_sort_key = sort_key
                best_candidate = candidate

        if best_candidate is None:
            break

        category = best_candidate.product.category or "__uncategorized__"
        best_candidate.diversity_penalty = category_counts[category] * tuning.diversity_penalty_weight
        best_candidate.score = best_candidate.base_score - best_candidate.diversity_penalty
        best_candidate.recommendation_reason = build_reason_summary(
            category_boost=best_candidate.category_boost,
            personal_score=best_candidate.personal_score,
            repeat_penalty=best_candidate.repeat_penalty,
            diversity_penalty=best_candidate.diversity_penalty,
            global_score=best_candidate.global_score,
        )
        best_candidate.debug = build_candidate_debug(best_candidate)
        reranked_candidates.append(best_candidate)
        category_counts[category] += 1
        remaining_candidates.pop(best_index)

    for index, candidate in enumerate(reranked_candidates, start=1):
        candidate.current_rank = index
        candidate.debug = build_candidate_debug(candidate)

    return reranked_candidates


def build_candidate_debug(candidate: RecommendationCandidate) -> dict[str, int | float | str | None]:
    return {
        "base_score": candidate.base_score,
        "baseline_score": candidate.baseline_score,
        "baseline_rank": candidate.baseline_rank,
        "current_rank": candidate.current_rank,
        "rank_delta": (
            candidate.baseline_rank - candidate.current_rank
            if candidate.baseline_rank is not None and candidate.current_rank is not None
            else None
        ),
        "global_score": candidate.global_score,
        "personal_score": candidate.personal_score,
        "personal_weighted_score": candidate.personal_weighted_score,
        "category_boost": candidate.category_boost,
        "repeat_penalty": candidate.repeat_penalty,
        "repeat_count": candidate.repeat_count,
        "diversity_penalty": candidate.diversity_penalty,
    }


def get_top_drivers(candidates: list[RecommendationCandidate], limit: int) -> list[dict[str, int | float | str]]:
    driver_totals = {
        "global demand": 0,
        "personal activity": 0,
        "category affinity": 0,
        "repeat suppression": 0,
        "diversity rerank": 0,
    }

    for candidate in candidates[:limit]:
        driver_totals["global demand"] += candidate.global_score
        driver_totals["personal activity"] += candidate.personal_weighted_score
        driver_totals["category affinity"] += candidate.category_boost
        driver_totals["repeat suppression"] += abs(candidate.repeat_penalty)
        driver_totals["diversity rerank"] += abs(candidate.diversity_penalty)

    total = sum(driver_totals.values())
    return [
        {
            "signal": signal,
            "impact": impact,
            "share": round(impact / total, 3) if total > 0 else 0.0,
        }
        for signal, impact in sorted(driver_totals.items(), key=lambda item: item[1], reverse=True)
        if impact > 0
    ]


def compare_to_baseline(
    current: list[RecommendationCandidate],
    baseline: list[RecommendationCandidate],
    limit: int,
) -> dict[str, int | float | str | list[str]]:
    current_ids = [candidate.product.id for candidate in current[:limit]]
    baseline_ids = [candidate.product.id for candidate in baseline[:limit]]
    overlap = len(set(current_ids).intersection(baseline_ids))
    moved_up = [
        candidate.product.name
        for candidate in current[:limit]
        if candidate.baseline_rank is not None
        and candidate.current_rank is not None
        and candidate.baseline_rank > candidate.current_rank
    ]

    return {
        "baseline_strategy": "global recency-weighted interaction score",
        "current_strategy": "global demand + personal affinity + repeat suppression + diversity rerank",
        "top_n": limit,
        "overlap_count": overlap,
        "overlap_ratio": round(overlap / limit, 3) if limit > 0 else 0.0,
        "current_only_product_ids": [product_id for product_id in current_ids if product_id not in baseline_ids],
        "baseline_only_product_ids": [product_id for product_id in baseline_ids if product_id not in current_ids],
        "moved_up_products": moved_up[:limit],
    }


def build_summary(
    active_product_count: int,
    interaction_count: int,
    personal_interaction_count: int,
    personal_category_affinity: dict[str, float],
    recommendations: list[RecommendationCandidate],
    limit: int,
) -> dict[str, int | float | str | list[str]]:
    strongest_categories = [
        category
        for category, _score in sorted(personal_category_affinity.items(), key=lambda item: item[1], reverse=True)[:3]
    ]
    visible_recommendations = recommendations[:limit]

    return {
        "active_product_count": active_product_count,
        "interaction_count": interaction_count,
        "personal_interaction_count": personal_interaction_count,
        "strongest_personal_categories": strongest_categories,
        "top_recommendation_count": len(visible_recommendations),
        "average_score": round(
            sum(candidate.score for candidate in visible_recommendations) / len(visible_recommendations),
            2,
        )
        if visible_recommendations
        else 0.0,
    }


def build_recommendation_evaluation(
    db: Session,
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int = 10,
    tuning: RecommendationTuningConfig | None = None,
) -> RecommendationEvaluation:
    tuning = tuning or RecommendationTuningConfig()
    now = datetime.now(timezone.utc)
    active_products = db.execute(
        select(Product).where(Product.status == "ACTIVE").order_by(Product.created_at.desc())
    ).scalars().all()

    if not active_products:
        return RecommendationEvaluation(
            recommendations=[],
            baseline_recommendations=[],
            tuning=tuning,
            summary=build_summary(0, 0, 0, {}, [], limit),
            top_drivers=[],
            baseline_comparison=compare_to_baseline([], [], limit),
        )

    interactions = db.execute(select(Interaction)).scalars().all()

    global_scores_by_product: dict[str, float] = defaultdict(float)
    personal_scores_by_product: dict[str, float] = defaultdict(float)
    personal_interaction_counts: dict[str, int] = defaultdict(int)
    personal_category_affinity: dict[str, float] = defaultdict(float)
    personal_interaction_count = 0

    for interaction in interactions:
        interaction_score = score_interaction(interaction, now, tuning)
        global_scores_by_product[interaction.product_id] += interaction_score

        if not matches_visitor(interaction, user_id, session_id):
            continue

        personal_interaction_count += 1
        personal_scores_by_product[interaction.product_id] += interaction_score
        personal_interaction_counts[interaction.product_id] += 1

    products_by_id = {product.id: product for product in active_products}
    for product_id, score in personal_scores_by_product.items():
        category = products_by_id.get(product_id).category if product_id in products_by_id else None
        if category:
            personal_category_affinity[category] += score

    max_category_affinity = max(personal_category_affinity.values(), default=0.0)
    candidates: list[RecommendationCandidate] = []

    for product in active_products:
        global_score = int(round(global_scores_by_product.get(product.id, 0.0)))
        personal_score = int(round(personal_scores_by_product.get(product.id, 0.0)))

        category_boost = 0
        if product.category and max_category_affinity > 0:
            category_boost = int(
                round(
                    (personal_category_affinity.get(product.category, 0.0) / max_category_affinity)
                    * tuning.category_affinity_weight
                )
            )

        repeat_penalty = 0
        repeat_count = personal_interaction_counts.get(product.id, 0)
        if repeat_count > 0:
            repeat_penalty = min(
                tuning.repeat_penalty_cap,
                int(round(personal_scores_by_product[product.id] * tuning.repeat_score_multiplier))
                + (repeat_count * tuning.repeat_count_weight),
            )

        personal_weighted_score = int(round(personal_score * tuning.personal_score_weight))
        base_score = int(round(global_score + personal_weighted_score + category_boost - repeat_penalty))
        candidates.append(
            RecommendationCandidate(
                product=product,
                score=base_score,
                baseline_score=global_score,
                baseline_rank=None,
                current_rank=None,
                global_score=global_score,
                personal_score=personal_score,
                personal_weighted_score=personal_weighted_score,
                category_boost=category_boost,
                repeat_penalty=repeat_penalty,
                repeat_count=repeat_count,
                diversity_penalty=0,
                base_score=base_score,
                recommendation_reason="",
                debug={},
            )
        )

    baseline_ranked = rank_baseline_candidates(candidates)
    current_ranked = sorted(
        candidates,
        key=lambda candidate: (
            candidate.base_score,
            candidate.personal_score,
            candidate.global_score,
            candidate.product.created_at,
        ),
        reverse=True,
    )
    current_ranked = apply_diversity_rerank(current_ranked, tuning)

    return RecommendationEvaluation(
        recommendations=current_ranked,
        baseline_recommendations=baseline_ranked,
        tuning=tuning,
        summary=build_summary(
            active_product_count=len(active_products),
            interaction_count=len(interactions),
            personal_interaction_count=personal_interaction_count,
            personal_category_affinity=personal_category_affinity,
            recommendations=current_ranked,
            limit=limit,
        ),
        top_drivers=get_top_drivers(current_ranked, limit),
        baseline_comparison=compare_to_baseline(current_ranked, baseline_ranked, limit),
    )


def tuning_as_dict(tuning: RecommendationTuningConfig) -> dict[str, int | float]:
    return asdict(tuning)

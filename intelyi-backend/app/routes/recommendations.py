from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import RecommendedProductOut, RecommendationBreakdownOut, RecommendationEvaluationOut
from ..security import require_admin_request
from ..services.recommendations import (
    RecommendationCandidate,
    RecommendationTuningConfig,
    build_recommendation_evaluation,
    tuning_as_dict,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def candidate_to_recommendation_out(
    candidate: RecommendationCandidate,
    debug: bool = False,
) -> RecommendedProductOut:
    return RecommendedProductOut(
        id=candidate.product.id,
        name=candidate.product.name,
        description=candidate.product.description,
        image_url=candidate.product.image_url,
        category=candidate.product.category,
        brand=candidate.product.brand,
        price_cents=candidate.product.price_cents,
        status=candidate.product.status,
        score=candidate.score,
        personal_score=candidate.personal_score,
        global_score=candidate.global_score,
        recommendation_reason=candidate.recommendation_reason,
        debug=candidate.debug if debug else None,
    )


def candidate_to_breakdown_out(
    candidate: RecommendationCandidate,
    use_baseline_score: bool = False,
) -> RecommendationBreakdownOut:
    rank_delta = (
        candidate.baseline_rank - candidate.current_rank
        if candidate.baseline_rank is not None and candidate.current_rank is not None
        else None
    )
    components = {
        "global_score": candidate.global_score,
        "personal_score": candidate.personal_score,
        "personal_weighted_score": candidate.personal_weighted_score,
        "category_boost": candidate.category_boost,
        "repeat_penalty": candidate.repeat_penalty,
        "repeat_count": candidate.repeat_count,
        "diversity_penalty": candidate.diversity_penalty,
        "base_score": candidate.base_score,
    }

    return RecommendationBreakdownOut(
        id=candidate.product.id,
        name=candidate.product.name,
        description=candidate.product.description,
        image_url=candidate.product.image_url,
        category=candidate.product.category,
        brand=candidate.product.brand,
        price_cents=candidate.product.price_cents,
        status=candidate.product.status,
        score=candidate.baseline_score if use_baseline_score else candidate.score,
        personal_score=candidate.personal_score,
        global_score=candidate.global_score,
        recommendation_reason=candidate.recommendation_reason,
        debug=candidate.debug,
        baseline_score=candidate.baseline_score,
        baseline_rank=candidate.baseline_rank,
        current_rank=candidate.current_rank,
        rank_delta=rank_delta,
        components=components,
    )


def build_tuning_config(
    personal_score_weight: float | None,
    category_affinity_weight: int | None,
    repeat_penalty_cap: int | None,
    diversity_penalty_weight: int | None,
) -> RecommendationTuningConfig:
    defaults = RecommendationTuningConfig()
    return RecommendationTuningConfig(
        personal_score_weight=personal_score_weight
        if personal_score_weight is not None
        else defaults.personal_score_weight,
        category_affinity_weight=category_affinity_weight
        if category_affinity_weight is not None
        else defaults.category_affinity_weight,
        repeat_penalty_cap=repeat_penalty_cap if repeat_penalty_cap is not None else defaults.repeat_penalty_cap,
        diversity_penalty_weight=diversity_penalty_weight
        if diversity_penalty_weight is not None
        else defaults.diversity_penalty_weight,
        repeat_score_multiplier=defaults.repeat_score_multiplier,
        repeat_count_weight=defaults.repeat_count_weight,
        recent_3_day_multiplier=defaults.recent_3_day_multiplier,
        recent_14_day_multiplier=defaults.recent_14_day_multiplier,
        recent_45_day_multiplier=defaults.recent_45_day_multiplier,
        older_multiplier=defaults.older_multiplier,
        missing_timestamp_multiplier=defaults.missing_timestamp_multiplier,
    )


@router.get("", response_model=list[RecommendedProductOut])
def list_recommendations(
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int | None = Query(default=None, ge=1),
    debug: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    evaluation = build_recommendation_evaluation(
        db=db,
        user_id=user_id,
        session_id=session_id,
        limit=limit or 10,
    )
    recommendations = evaluation.recommendations[:limit] if limit is not None else evaluation.recommendations
    return [candidate_to_recommendation_out(candidate, debug=debug) for candidate in recommendations]


@router.get(
    "/evaluate",
    response_model=RecommendationEvaluationOut,
    dependencies=[Depends(require_admin_request)],
)
def evaluate_recommendations(
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int = Query(default=10, ge=1, le=50),
    personal_score_weight: float | None = Query(default=None, ge=0, le=10),
    category_affinity_weight: int | None = Query(default=None, ge=0, le=50),
    repeat_penalty_cap: int | None = Query(default=None, ge=0, le=100),
    diversity_penalty_weight: int | None = Query(default=None, ge=0, le=30),
    db: Session = Depends(get_db),
):
    tuning = build_tuning_config(
        personal_score_weight=personal_score_weight,
        category_affinity_weight=category_affinity_weight,
        repeat_penalty_cap=repeat_penalty_cap,
        diversity_penalty_weight=diversity_penalty_weight,
    )
    evaluation = build_recommendation_evaluation(
        db=db,
        user_id=user_id,
        session_id=session_id,
        limit=limit,
        tuning=tuning,
    )

    return RecommendationEvaluationOut(
        context={
            "user_id": user_id,
            "session_id": session_id,
            "limit": limit,
        },
        tuning=tuning_as_dict(evaluation.tuning),
        summary=evaluation.summary,
        top_drivers=evaluation.top_drivers,
        baseline_comparison=evaluation.baseline_comparison,
        recommendations=[
            candidate_to_breakdown_out(candidate)
            for candidate in evaluation.recommendations[:limit]
        ],
        baseline_recommendations=[
            candidate_to_breakdown_out(candidate, use_baseline_score=True)
            for candidate in evaluation.baseline_recommendations[:limit]
        ],
    )

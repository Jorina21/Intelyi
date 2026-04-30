from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import (
    PromotionSlotActionStatsOut,
    PromotionSlotDebugOut,
    PromotionSlotDecisionSummaryOut,
    PromotionSlotProductOut,
    PromotionSlotRewardCreate,
    PromotionSlotSelectionOut,
)
from ..security import get_trusted_proxy_context, require_admin_request
from ..services.promotion_slots import (
    EPSILON,
    SLOT_KEY,
    get_homepage_slot_debug,
    reward_homepage_decision,
    select_homepage_slot,
)

router = APIRouter(prefix="/promotion-slots", tags=["promotion-slots"])


@router.get("/homepage", response_model=PromotionSlotSelectionOut)
def get_homepage_promotion_slot(
    session_id: str | None = None,
    limit: int = Query(default=4, ge=1, le=8),
    proxy_context=Depends(get_trusted_proxy_context),
    db: Session = Depends(get_db),
):
    decision, action, context, stats_by_action = select_homepage_slot(
        db=db,
        user_id=proxy_context.user_id,
        session_id=session_id,
        limit=limit,
    )
    return PromotionSlotSelectionOut(
        slot_key=SLOT_KEY,
        page_context=context.page_context,
        decision_id=decision.id,
        action_key=action.action_key,
        title=action.title,
        subtitle=action.subtitle,
        rationale=action.rationale,
        products=[PromotionSlotProductOut.model_validate(product) for product in action.products],
        decision_mode=decision.selection_mode,
        epsilon=EPSILON,
        context=context.as_features(),
        estimated_reward=decision.estimated_reward / 1000,
        action_stats={
            action_key: {
                "impressions": stat.impressions if stat else 0,
                "rewards": stat.rewards if stat else 0,
                "reward_rate": round((stat.rewards / stat.impressions), 3) if stat and stat.impressions > 0 else 0.0,
                "context_key": context.context_key,
            }
            for action_key, stat in {key: stats_by_action.get(key) for key in ("trending_picks", "affinity_picks", "fresh_discovery")}.items()
        },
    )


@router.post("/reward", response_model=PromotionSlotDecisionSummaryOut)
def create_promotion_slot_reward(
    payload: PromotionSlotRewardCreate,
    proxy_context=Depends(get_trusted_proxy_context),
    db: Session = Depends(get_db),
):
    try:
        decision = reward_homepage_decision(
            db=db,
            decision_id=payload.decision_id,
            session_id=payload.session_id,
            user_id=proxy_context.user_id,
            product_id=payload.product_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return PromotionSlotDecisionSummaryOut(
        id=decision.id,
        action_key=decision.action_key,
        selection_mode=decision.selection_mode,
        estimated_reward=decision.estimated_reward / 1000,
        context_key=decision.context_key,
        context_features=decision.context_features,
        reward_event_type=decision.reward_event_type,
        reward_product_id=decision.reward_product_id,
        rewarded_at=decision.rewarded_at,
        created_at=decision.created_at,
    )


@router.get("/debug/homepage", response_model=PromotionSlotDebugOut, dependencies=[Depends(require_admin_request)])
def get_homepage_promotion_slot_debug(
    user_id: str | None = None,
    session_id: str | None = None,
    limit: int = Query(default=12, ge=1, le=25),
    db: Session = Depends(get_db),
):
    debug_data = get_homepage_slot_debug(
        db=db,
        user_id=user_id,
        session_id=session_id,
        limit=limit,
    )
    return PromotionSlotDebugOut(
        slot_key=debug_data["slot_key"],
        epsilon=debug_data["epsilon"],
        candidate_actions=debug_data["candidate_actions"],
        context=debug_data["context"],
        exploit_action=debug_data["exploit_action"],
        current_context_stats=[
            PromotionSlotActionStatsOut.model_validate(item)
            for item in debug_data["current_context_stats"]
        ],
        aggregate_stats=[
            PromotionSlotActionStatsOut.model_validate(item)
            for item in debug_data["aggregate_stats"]
        ],
        recent_decisions=[
            PromotionSlotDecisionSummaryOut(
                id=decision.id,
                action_key=decision.action_key,
                selection_mode=decision.selection_mode,
                estimated_reward=decision.estimated_reward / 1000,
                context_key=decision.context_key,
                context_features=decision.context_features,
                reward_event_type=decision.reward_event_type,
                reward_product_id=decision.reward_product_id,
                rewarded_at=decision.rewarded_at,
                created_at=decision.created_at,
            )
            for decision in debug_data["recent_decisions"]
        ],
    )


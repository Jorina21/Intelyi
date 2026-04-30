from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Interaction, Product, PromotionSlotActionStat, PromotionSlotDecision


SLOT_KEY = "homepage_merchandising_slot"
PAGE_CONTEXT = "homepage"
ACTION_KEYS = ("trending_picks", "affinity_picks", "fresh_discovery")
EPSILON = 0.2
REWARD_EVENT_TYPE = "slot_click"
EVENT_WEIGHTS = {
    "view": 1.0,
    "click": 3.0,
    "add_to_cart": 8.0,
    "purchase": 20.0,
}


@dataclass(frozen=True)
class PromotionContext:
    page_context: str
    user_state: str
    top_category: str | None
    user_id: str | None
    session_id: str | None

    @property
    def context_key(self) -> str:
        return f"{self.page_context}:{self.user_state}:{self.top_category or 'none'}"

    def as_features(self) -> dict[str, str | None]:
        return {
            "page_context": self.page_context,
            "user_state": self.user_state,
            "top_category": self.top_category,
        }


@dataclass(frozen=True)
class PromotionAction:
    action_key: str
    title: str
    subtitle: str
    rationale: str
    products: list[Product]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _matches_visitor(interaction: Interaction, user_id: str | None, session_id: str | None) -> bool:
    if user_id and interaction.user_id == user_id:
        return True
    if session_id and interaction.session_id == session_id:
        return True
    return False


def _score_interaction(interaction: Interaction) -> float:
    return EVENT_WEIGHTS.get(interaction.event_type, 0.0)


def _load_active_products(db: Session) -> list[Product]:
    return db.execute(
        select(Product).where(Product.status == "ACTIVE").order_by(Product.created_at.desc(), Product.name.asc())
    ).scalars().all()


def _load_interactions(db: Session) -> list[Interaction]:
    return db.execute(select(Interaction)).scalars().all()


def _build_global_scores(interactions: list[Interaction]) -> dict[str, float]:
    scores: dict[str, float] = defaultdict(float)
    for interaction in interactions:
        scores[interaction.product_id] += _score_interaction(interaction)
    return scores


def _derive_top_category(
    products_by_id: dict[str, Product],
    interactions: list[Interaction],
    user_id: str | None,
    session_id: str | None,
) -> str | None:
    category_scores: dict[str, float] = defaultdict(float)

    for interaction in interactions:
        if not _matches_visitor(interaction, user_id=user_id, session_id=session_id):
            continue

        product = products_by_id.get(interaction.product_id)
        if not product or not product.category:
            continue

        category_scores[product.category] += _score_interaction(interaction)

    if not category_scores:
        return None

    return max(category_scores.items(), key=lambda item: (item[1], item[0]))[0]


def build_promotion_context(
    db: Session,
    user_id: str | None,
    session_id: str | None,
    page_context: str = PAGE_CONTEXT,
) -> PromotionContext:
    products = _load_active_products(db)
    products_by_id = {product.id: product for product in products}
    interactions = _load_interactions(db)
    top_category = _derive_top_category(
        products_by_id=products_by_id,
        interactions=interactions,
        user_id=user_id,
        session_id=session_id,
    )
    return PromotionContext(
        page_context=page_context,
        user_state="signed_in" if user_id else "guest",
        top_category=top_category,
        user_id=user_id,
        session_id=session_id,
    )


def _dedupe_products(products: list[Product], limit: int) -> list[Product]:
    seen_ids: set[str] = set()
    deduped: list[Product] = []

    for product in products:
        if product.id in seen_ids:
            continue
        seen_ids.add(product.id)
        deduped.append(product)
        if len(deduped) >= limit:
            break

    return deduped


def _sort_by_global_demand(products: list[Product], scores: dict[str, float]) -> list[Product]:
    return sorted(
        products,
        key=lambda product: (scores.get(product.id, 0.0), product.created_at, product.name),
        reverse=True,
    )


def build_candidate_actions(
    db: Session,
    context: PromotionContext,
    limit: int = 4,
) -> dict[str, PromotionAction]:
    active_products = _load_active_products(db)
    interactions = _load_interactions(db)
    global_scores = _build_global_scores(interactions)
    trending_products = _sort_by_global_demand(active_products, global_scores)

    trending = _dedupe_products(trending_products, limit)
    fresh = _dedupe_products(active_products, limit)

    affinity_candidates = [
        product for product in trending_products if context.top_category and product.category == context.top_category
    ]
    affinity_products = _dedupe_products(affinity_candidates + trending_products, limit)

    affinity_title = f"More in {context.top_category}" if context.top_category else "Shaped by browsing intent"
    affinity_subtitle = (
        "This variant leans on the strongest category signal seen in the current shopper context."
        if context.top_category
        else "No category affinity is available yet, so this variant falls back to the strongest backend-ranked assortment."
    )
    affinity_rationale = (
        f"Explores or exploits a category-affinity shelf using recent signals for {context.top_category}."
        if context.top_category
        else "Category affinity has not formed yet, so the affinity action currently falls back to general relevance."
    )

    return {
        "trending_picks": PromotionAction(
            action_key="trending_picks",
            title="Trending picks",
            subtitle="Uses aggregate storefront demand from views, clicks, carts, and purchases.",
            rationale="This action exploits broad demand signals instead of session-specific taste.",
            products=trending,
        ),
        "affinity_picks": PromotionAction(
            action_key="affinity_picks",
            title=affinity_title,
            subtitle=affinity_subtitle,
            rationale=affinity_rationale,
            products=affinity_products,
        ),
        "fresh_discovery": PromotionAction(
            action_key="fresh_discovery",
            title="Fresh discovery",
            subtitle="Prioritizes newer catalog additions so the slot does not collapse into the same winners.",
            rationale="This action keeps the homepage exploratory by surfacing recent products with minimal filtering.",
            products=fresh,
        ),
    }


def _estimate_reward(stat: PromotionSlotActionStat | None) -> float:
    if not stat or stat.impressions == 0:
        return 0.0
    return stat.rewards / stat.impressions


def _get_context_stats(db: Session, context: PromotionContext) -> dict[str, PromotionSlotActionStat]:
    stats = db.execute(
        select(PromotionSlotActionStat).where(
            PromotionSlotActionStat.slot_key == SLOT_KEY,
            PromotionSlotActionStat.context_key == context.context_key,
        )
    ).scalars().all()
    return {stat.action_key: stat for stat in stats}


def _get_or_create_action_stat(
    db: Session,
    context: PromotionContext,
    action_key: str,
) -> PromotionSlotActionStat:
    stat = db.execute(
        select(PromotionSlotActionStat).where(
            PromotionSlotActionStat.slot_key == SLOT_KEY,
            PromotionSlotActionStat.context_key == context.context_key,
            PromotionSlotActionStat.action_key == action_key,
        )
    ).scalar_one_or_none()

    if stat is not None:
        return stat

    stat = PromotionSlotActionStat(
        slot_key=SLOT_KEY,
        page_context=context.page_context,
        context_key=context.context_key,
        action_key=action_key,
    )
    db.add(stat)
    db.flush()
    return stat


def choose_action(
    stats_by_action: dict[str, PromotionSlotActionStat],
) -> tuple[str, str, float]:
    ranked_actions = sorted(
        ACTION_KEYS,
        key=lambda action_key: (
            _estimate_reward(stats_by_action.get(action_key)),
            -(stats_by_action.get(action_key).impressions if stats_by_action.get(action_key) else 0),
            action_key,
        ),
        reverse=True,
    )
    exploit_action = ranked_actions[0]

    if random.random() < EPSILON:
        return random.choice(list(ACTION_KEYS)), "explore", _estimate_reward(stats_by_action.get(exploit_action))

    return exploit_action, "exploit", _estimate_reward(stats_by_action.get(exploit_action))


def select_homepage_slot(
    db: Session,
    user_id: str | None,
    session_id: str | None,
    limit: int = 4,
) -> tuple[PromotionSlotDecision, PromotionAction, PromotionContext, dict[str, PromotionSlotActionStat]]:
    context = build_promotion_context(db=db, user_id=user_id, session_id=session_id)
    stats_by_action = _get_context_stats(db, context)
    action_key, selection_mode, estimated_reward = choose_action(stats_by_action)
    actions = build_candidate_actions(db=db, context=context, limit=limit)
    action = actions[action_key]

    decision = PromotionSlotDecision(
        slot_key=SLOT_KEY,
        page_context=context.page_context,
        action_key=action_key,
        selection_mode=selection_mode,
        epsilon=int(EPSILON * 100),
        estimated_reward=int(round(estimated_reward * 1000)),
        user_id=user_id,
        session_id=session_id,
        context_key=context.context_key,
        context_features=context.as_features(),
    )
    db.add(decision)

    stat = _get_or_create_action_stat(db=db, context=context, action_key=action_key)
    stat.impressions += 1

    db.commit()
    db.refresh(decision)

    return decision, action, context, _get_context_stats(db, context)


def reward_homepage_decision(
    db: Session,
    decision_id: str,
    session_id: str | None,
    user_id: str | None,
    product_id: str | None,
) -> PromotionSlotDecision:
    decision = db.get(PromotionSlotDecision, decision_id)
    if decision is None:
        raise ValueError("Decision not found")

    if decision.rewarded_at is not None:
        return decision

    owns_decision = False
    if user_id and decision.user_id == user_id:
        owns_decision = True
    if session_id and decision.session_id == session_id:
        owns_decision = True
    if decision.user_id is None and decision.session_id is None:
        owns_decision = True

    if not owns_decision:
        raise PermissionError("Decision context does not match reward context")

    decision.rewarded_at = _now()
    decision.reward_event_type = REWARD_EVENT_TYPE
    decision.reward_product_id = product_id

    context = PromotionContext(
        page_context=decision.page_context,
        user_state=(decision.context_features or {}).get("user_state") or ("signed_in" if decision.user_id else "guest"),
        top_category=(decision.context_features or {}).get("top_category"),
        user_id=decision.user_id,
        session_id=decision.session_id,
    )
    stat = _get_or_create_action_stat(db=db, context=context, action_key=decision.action_key)
    stat.rewards += 1
    stat.last_rewarded_at = decision.rewarded_at

    db.commit()
    db.refresh(decision)
    return decision


def _aggregate_stats(db: Session) -> dict[str, dict[str, int]]:
    stats = db.execute(
        select(PromotionSlotActionStat).where(PromotionSlotActionStat.slot_key == SLOT_KEY)
    ).scalars().all()
    aggregate: dict[str, dict[str, int]] = {
        action_key: {"impressions": 0, "rewards": 0} for action_key in ACTION_KEYS
    }
    for stat in stats:
        aggregate.setdefault(stat.action_key, {"impressions": 0, "rewards": 0})
        aggregate[stat.action_key]["impressions"] += stat.impressions
        aggregate[stat.action_key]["rewards"] += stat.rewards
    return aggregate


def get_homepage_slot_debug(
    db: Session,
    user_id: str | None,
    session_id: str | None,
    limit: int = 12,
) -> dict[str, object]:
    context = build_promotion_context(db=db, user_id=user_id, session_id=session_id)
    context_stats = _get_context_stats(db, context)
    aggregate = _aggregate_stats(db)
    exploit_action = max(
        ACTION_KEYS,
        key=lambda action_key: (
            _estimate_reward(context_stats.get(action_key)),
            -(context_stats.get(action_key).impressions if context_stats.get(action_key) else 0),
            action_key,
        ),
    )
    recent_decisions = db.execute(
        select(PromotionSlotDecision)
        .where(PromotionSlotDecision.slot_key == SLOT_KEY)
        .order_by(PromotionSlotDecision.created_at.desc())
        .limit(limit)
    ).scalars().all()

    return {
        "slot_key": SLOT_KEY,
        "epsilon": EPSILON,
        "candidate_actions": list(ACTION_KEYS),
        "context": context.as_features(),
        "exploit_action": exploit_action,
        "current_context_stats": [
            {
                "action_key": action_key,
                "impressions": context_stats.get(action_key).impressions if context_stats.get(action_key) else 0,
                "rewards": context_stats.get(action_key).rewards if context_stats.get(action_key) else 0,
                "reward_rate": round(_estimate_reward(context_stats.get(action_key)), 3),
                "context_key": context.context_key,
                "updated_at": context_stats.get(action_key).updated_at if context_stats.get(action_key) else None,
            }
            for action_key in ACTION_KEYS
        ],
        "aggregate_stats": [
            {
                "action_key": action_key,
                "impressions": aggregate[action_key]["impressions"],
                "rewards": aggregate[action_key]["rewards"],
                "reward_rate": round(
                    aggregate[action_key]["rewards"] / aggregate[action_key]["impressions"],
                    3,
                )
                if aggregate[action_key]["impressions"] > 0
                else 0.0,
                "context_key": "all",
                "updated_at": None,
            }
            for action_key in ACTION_KEYS
        ],
        "recent_decisions": recent_decisions,
    }


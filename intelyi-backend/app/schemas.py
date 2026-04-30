from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ProductCreate(BaseModel):
    source_dataset: str | None = None
    source_external_id: str | None = None
    name: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    price_cents: int = Field(ge=0)
    status: str = "ACTIVE"


class ProductOut(BaseModel):
    id: str
    source_dataset: str | None = None
    source_external_id: str | None = None
    name: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    price_cents: int
    status: str

    model_config = {"from_attributes": True}


class InteractionCreate(BaseModel):
    product_id: str
    user_id: str | None = None
    session_id: str | None = None
    event_type: str
    event_value: int | None = None


class InteractionOut(BaseModel):
    id: str
    product_id: str
    user_id: str | None = None
    session_id: str | None = None
    event_type: str
    event_value: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromotionSlotRewardCreate(BaseModel):
    decision_id: str
    session_id: str | None = None
    product_id: str | None = None


class PromotionSlotProductOut(ProductOut):
    pass


class PromotionSlotSelectionOut(BaseModel):
    slot_key: str
    page_context: str
    decision_id: str
    action_key: str
    title: str
    subtitle: str
    rationale: str
    products: list[PromotionSlotProductOut]
    decision_mode: str
    epsilon: float
    context: dict[str, str | None]
    estimated_reward: float
    action_stats: dict[str, dict[str, int | float | str | None]]


class PromotionSlotDecisionSummaryOut(BaseModel):
    id: str
    action_key: str
    selection_mode: str
    estimated_reward: float
    context_key: str
    context_features: dict[str, str | None]
    reward_event_type: str | None = None
    reward_product_id: str | None = None
    rewarded_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromotionSlotActionStatsOut(BaseModel):
    action_key: str
    impressions: int
    rewards: int
    reward_rate: float
    context_key: str
    updated_at: datetime | None = None


class PromotionSlotDebugOut(BaseModel):
    slot_key: str
    epsilon: float
    candidate_actions: list[str]
    context: dict[str, str | None]
    exploit_action: str
    current_context_stats: list[PromotionSlotActionStatsOut]
    aggregate_stats: list[PromotionSlotActionStatsOut]
    recent_decisions: list[PromotionSlotDecisionSummaryOut]


class RecommendedProductOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    price_cents: int
    status: str
    score: int
    personal_score: int
    global_score: int
    recommendation_reason: str | None = None
    debug: dict[str, int | float | str | None] | None = None


class RecommendationBreakdownOut(RecommendedProductOut):
    baseline_score: int
    baseline_rank: int | None = None
    current_rank: int | None = None
    rank_delta: int | None = None
    components: dict[str, int | float | str | None]


class RecommendationEvaluationOut(BaseModel):
    context: dict[str, str | int | None]
    tuning: dict[str, int | float]
    summary: dict[str, Any]
    top_drivers: list[dict[str, int | float | str]]
    baseline_comparison: dict[str, Any]
    recommendations: list[RecommendationBreakdownOut]
    baseline_recommendations: list[RecommendationBreakdownOut]


class ProductBundleItemOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    price_cents: int
    status: str
    score: int
    bundle_reason: str
    debug: dict[str, int | float | str | None] | None = None


class ProductAnalyticsOut(BaseModel):
    product_id: str
    name: str
    views: int
    clicks: int
    add_to_cart: int
    purchases: int
    score: int
    ctr: float


class CartContextMixin(BaseModel):
    user_id: str | None = None
    session_id: str | None = None

    @model_validator(mode="after")
    def validate_owner_context(self):
        if not self.user_id and not self.session_id:
            raise ValueError("user_id or session_id is required")
        return self


class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartGetRequest(CartContextMixin):
    pass


class CartAddItemRequest(CartContextMixin):
    product_id: str
    quantity: int = Field(default=1, ge=1)


class CartProductSummary(BaseModel):
    id: str
    name: str
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    status: str

    model_config = {"from_attributes": True}


class CartItemOut(BaseModel):
    id: str
    quantity: int
    unit_price_cents: int
    line_subtotal_cents: int
    product: CartProductSummary


class CartOut(BaseModel):
    id: str
    user_id: str | None = None
    session_id: str | None = None
    status: str
    items: list[CartItemOut]
    total_item_count: int
    cart_subtotal_cents: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckoutInitiationRequest(CartContextMixin):
    pass


class CheckoutSessionCreateRequest(CartContextMixin):
    pass


class CheckoutSessionOut(BaseModel):
    order_id: str
    checkout_session_id: str
    checkout_url: str


class OrderItemOut(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_image_url: str | None = None
    product_category: str | None = None
    product_brand: str | None = None
    quantity: int
    unit_price_cents: int
    line_subtotal_cents: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    user_id: str | None = None
    session_id: str | None = None
    source_cart_id: str | None = None
    status: str
    items: list[OrderItemOut]
    total_item_count: int
    order_subtotal_cents: int
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

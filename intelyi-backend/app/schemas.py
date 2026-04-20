from datetime import datetime

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

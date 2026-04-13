from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    brand: str | None = None
    price_cents: int = Field(ge=0)
    status: str = "ACTIVE"


class ProductOut(BaseModel):
    id: str
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

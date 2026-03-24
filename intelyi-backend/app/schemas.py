from datetime import datetime

from pydantic import BaseModel, Field


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

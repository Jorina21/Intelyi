from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price_cents: int = Field(ge=0)
    status: str = "ACTIVE"


class ProductOut(BaseModel):
    id: str
    name: str
    description: str | None = None
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
    price_cents: int
    status: str
    score: int

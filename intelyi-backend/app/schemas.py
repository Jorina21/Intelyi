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

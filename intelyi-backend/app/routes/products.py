from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product
from ..security import require_admin_request
from ..schemas import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


def apply_product_sort(statement, sort: str):
    if sort == "price_asc":
        return statement.order_by(Product.price_cents.asc(), Product.name.asc())
    if sort == "price_desc":
        return statement.order_by(Product.price_cents.desc(), Product.name.asc())
    if sort == "name_asc":
        return statement.order_by(Product.name.asc(), Product.created_at.desc())
    return statement.order_by(Product.created_at.desc(), Product.name.asc())


@router.get("", response_model=list[ProductOut])
def list_products(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    sort: Literal["newest", "price_asc", "price_desc", "name_asc"] = "newest",
    db: Session = Depends(get_db),
):
    statement = select(Product)

    if status_filter:
        statement = statement.where(Product.status == status_filter)

    if category:
        statement = statement.where(Product.category == category.strip())

    if q:
        search_term = q.strip()
        if search_term:
            pattern = f"%{search_term}%"
            statement = statement.where(
                or_(
                    Product.name.ilike(pattern),
                    Product.description.ilike(pattern),
                    Product.brand.ilike(pattern),
                )
            )

    statement = apply_product_sort(statement, sort)
    products = db.execute(statement).scalars().all()
    return products


@router.get("/categories", response_model=list[str])
def list_product_categories(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    statement = select(Product.category).where(Product.category.is_not(None))

    if status_filter:
        statement = statement.where(Product.status == status_filter)

    statement = statement.distinct().order_by(Product.category.asc())
    categories = db.execute(statement).scalars().all()
    return [category for category in categories if category]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_request),
):
    product = Product(
        source_dataset=payload.source_dataset,
        source_external_id=payload.source_external_id,
        name=payload.name,
        description=payload.description,
        image_url=payload.image_url,
        category=payload.category,
        brand=payload.brand,
        price_cents=payload.price_cents,
        status=payload.status,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

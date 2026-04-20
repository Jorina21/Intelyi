from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product
from ..schemas import ProductCreate, ProductOut
from ..security import require_admin_request

router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
    dependencies=[Depends(require_admin_request)],
)


def load_product_or_404(db: Session, product_id: str) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_admin_product(payload: ProductCreate, db: Session = Depends(get_db)):
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


@router.put("/{product_id}", response_model=ProductOut)
def update_admin_product(product_id: str, payload: ProductCreate, db: Session = Depends(get_db)):
    product = load_product_or_404(db, product_id)
    product.source_dataset = payload.source_dataset
    product.source_external_id = payload.source_external_id
    product.name = payload.name
    product.description = payload.description
    product.image_url = payload.image_url
    product.category = payload.category
    product.brand = payload.brand
    product.price_cents = payload.price_cents
    product.status = payload.status
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_product(product_id: str, db: Session = Depends(get_db)):
    product = load_product_or_404(db, product_id)
    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/upload", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def upload_admin_products():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Admin upload is not implemented in the backend",
    )

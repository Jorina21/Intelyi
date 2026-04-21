from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import ProductBundleItemOut
from ..services.bundles import generate_product_bundle

router = APIRouter(prefix="/bundles", tags=["bundles"])


@router.get("/products/{product_id}", response_model=list[ProductBundleItemOut])
def get_product_bundle(
    product_id: str,
    limit: int = Query(default=4, ge=1, le=8),
    debug: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    anchor, candidates = generate_product_bundle(db, product_id=product_id, limit=limit)

    if anchor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return [
        ProductBundleItemOut(
            id=candidate.product.id,
            name=candidate.product.name,
            description=candidate.product.description,
            image_url=candidate.product.image_url,
            category=candidate.product.category,
            brand=candidate.product.brand,
            price_cents=candidate.product.price_cents,
            status=candidate.product.status,
            score=candidate.score,
            bundle_reason=candidate.reason,
            debug=(
                {
                    "relationship_score": candidate.relationship_score,
                    "category_score": candidate.category_score,
                    "brand_score": candidate.brand_score,
                    "price_score": candidate.price_score,
                    "popularity_score": candidate.popularity_score,
                    "duplicate_penalty": candidate.duplicate_penalty,
                    "diversity_penalty": candidate.diversity_penalty,
                }
                if debug
                else None
            ),
        )
        for candidate in candidates
    ]

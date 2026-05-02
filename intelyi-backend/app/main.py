from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .bootstrap import ensure_cart_schema, ensure_order_schema, ensure_product_schema
from .db import Base, engine
from .routes.analytics import router as analytics_router
from .routes.admin_products import router as admin_products_router
from .routes.bundles import router as bundles_router
from .routes.cart import router as cart_router
from .routes.interactions import router as interactions_router
from .routes.orders import router as orders_router
from .routes.products import router as products_router
from .routes.promotion_slots import router as promotion_slots_router
from .routes.recommendations import router as recommendations_router
from .routes.stripe_webhooks import router as stripe_webhooks_router
from .settings import settings

app = FastAPI(title="Intelyi Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    if settings.AUTO_BOOTSTRAP_SCHEMA:
        # Temporary bootstrap; prefer Alembic migrations for managed environments.
        Base.metadata.create_all(bind=engine)
        ensure_product_schema(engine)
        ensure_cart_schema(engine)
        ensure_order_schema(engine)


@app.get("/")
def root():
    return {"message": "Intelyi backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(products_router)
app.include_router(admin_products_router)
app.include_router(interactions_router)
app.include_router(recommendations_router)
app.include_router(promotion_slots_router)
app.include_router(bundles_router)
app.include_router(analytics_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(stripe_webhooks_router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .db import Base, engine
from .routes.interactions import router as interactions_router
from .routes.products import router as products_router
from .routes.recommendations import router as recommendations_router
from .settings import settings

app = FastAPI(title="Intelyi Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Temporary bootstrap; replace with Alembic migrations.
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Intelyi backend is running"}


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(products_router)
app.include_router(interactions_router)
app.include_router(recommendations_router)

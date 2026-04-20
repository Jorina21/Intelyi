# Intelyi

Intelyi is a full-stack commerce application built around a backend-owned merchandising engine. It combines a redesigned multi-category storefront, account-aware checkout flow, Stripe-backed order lifecycle, and deterministic recommendation logic that adapts to shopper behavior without moving business rules into the frontend.

## What The Project Does

Intelyi currently supports:

- Multi-category product catalog ingestion from curated Amazon-source datasets
- Backend-owned product search and category filtering
- Session-aware and signed-in shopping flows
- Cart, order creation, and Stripe Checkout
- Webhook-confirmed payment completion
- Account area and order history for signed-in users
- Analytics and recommendation endpoints
- Deterministic recommendation ranking with recency, category affinity, repeat suppression, and lightweight diversity behavior

The frontend renders UI and calls APIs. The backend owns product truth, ranking logic, interaction tracking, order/payment state, and data integrity rules.

## Monorepo Layout

```text
.
├── intelyi-frontend/   # Next.js App Router frontend, NextAuth, Prisma
├── intelyi-backend/    # FastAPI backend, SQLAlchemy, Alembic, Stripe, ingestion
└── data/               # Local source datasets used by ingestion scripts
```

## Architecture

### Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- NextAuth with Prisma adapter
- Prisma for auth/session persistence

Frontend responsibilities:

- UI rendering
- navigation
- server-side API proxying to FastAPI
- auth-aware UX

### Backend

- FastAPI
- SQLAlchemy 2
- Pydantic v2
- Alembic
- Stripe Python SDK

Backend responsibilities:

- product APIs
- recommendation ranking
- analytics aggregation
- interaction tracking
- cart and order logic
- payment confirmation
- ingestion and normalization

## Core Product Areas

### Storefront

- Light-theme storefront with backend-powered search and filtering
- Multi-category catalog
- Recommendation shelves driven by the FastAPI recommendation endpoint

### Commerce Flow

- Cart and order creation
- Stripe Checkout session creation
- Webhook-confirmed payment completion
- Owner-aware order detail retrieval

### Account Experience

- Signed-in account area
- Order history page
- Order detail continuity after purchase

### Merchandising Intelligence

- Interaction logging for `view`, `click`, `add_to_cart`, and `purchase`
- Recommendation ranking informed by:
  - recency-aware interaction weighting
  - category affinity
  - repeat suppression
  - basic diversity-aware reranking
- Product analytics endpoint compatible with the same interaction model

## Data And Ingestion

The repo includes local dataset assets under `data/`.

Current ingestion support includes:

- Existing apparel CSV dataset at `data/raw/products.csv`
- Broader multi-file Amazon dataset under `data/amazon_dataset/`

The ingestion pipeline is backend-owned and intentionally curated:

- normalizes raw rows into the internal product schema
- maps raw source categories into a shared storefront taxonomy
- tracks source provenance
- enforces row-quality filtering
- applies balanced category sampling instead of naive first-N import

Main ingestion script:

- `intelyi-backend/scripts/load_products.py`

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Python 3.10+
- PostgreSQL or Neon Postgres
- GitHub OAuth app for NextAuth
- Stripe account for checkout/webhook testing

## Environment Variables

### Frontend: `intelyi-frontend/.env.local`

Use values appropriate for your local environment:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
GITHUB_ID="your-github-oauth-client-id"
GITHUB_SECRET="your-github-oauth-client-secret"
FASTAPI_BASE_URL="http://localhost:8000"
INTERNAL_API_TOKEN="intelyi-dev-internal-token"
```

Notes:

- `DATABASE_URL` is used by Prisma and NextAuth.
- `FASTAPI_BASE_URL` points the frontend API proxies to FastAPI.
- `INTERNAL_API_TOKEN` should match the backend value so trusted server-to-server proxy calls work.

### Backend: `intelyi-backend/.env`

```env
DATABASE_URL="postgresql://..."
FRONTEND_ORIGIN="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_SUCCESS_URL="http://localhost:3000/checkout/success"
STRIPE_CANCEL_URL="http://localhost:3000/checkout/cancel"
INTERNAL_API_TOKEN="intelyi-dev-internal-token"
AUTO_BOOTSTRAP_SCHEMA="true"
```

Notes:

- `INTERNAL_API_TOKEN` must match the frontend value.
- `AUTO_BOOTSTRAP_SCHEMA` is available for local convenience, but Alembic is the preferred path for managed schema changes.

## Frontend Setup

From `intelyi-frontend/`:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Frontend runs at:

- `http://localhost:3000`

## Backend Setup

From `intelyi-backend/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs at:

- `http://localhost:8000`

Useful health endpoints:

- `GET /`
- `GET /health`

## Database And Schema Management

There are two database concerns in this repo:

### Prisma

Used by the frontend for:

- NextAuth users
- sessions
- linked auth accounts

Commands:

```bash
cd intelyi-frontend
npx prisma generate
npx prisma migrate dev
```

### Alembic

Used by the backend for:

- products
- interactions
- carts
- orders
- order items

Commands:

```bash
cd intelyi-backend
alembic upgrade head
alembic history
alembic current
```

## Running Ingestion

Example commands from `intelyi-backend/`:

```bash
python scripts/load_products.py --dataset amazon_apparel --limit 100 --max-per-category 5
python scripts/load_products.py --dataset amazon_products_2023 --limit 150 --max-per-category 8
```

Supported dataset keys:

- `amazon_apparel`
- `amazon_products_2023`

What the script does:

- reads the selected dataset from `data/`
- normalizes fields into the internal product schema
- tracks source dataset and source external id
- applies category normalization
- deduplicates rows
- inserts a balanced subset into the backend product table

## Important Backend Routes

### Catalog

- `GET /products`
- `GET /products/categories`
- `GET /products/{product_id}`

### Admin

- `POST /admin/products`
- `PUT /admin/products/{product_id}`
- `DELETE /admin/products/{product_id}`

These are protected and intended to be called through the frontend’s trusted proxy routes.

### Merchandising

- `POST /interactions`
- `GET /recommendations`
- `GET /analytics/products`

### Commerce

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{item_id}`
- `DELETE /cart/items/{item_id}`
- `POST /orders`
- `GET /orders`
- `GET /orders/{order_id}`
- `POST /orders/{order_id}/checkout-session`
- `POST /stripe/webhook`

## Auth And Permissions

Authentication is handled in the frontend with NextAuth.

Important auth-related behavior:

- signed-in users get account continuity and order history
- guest flows still work via session-based ownership
- backend owner checks remain authoritative
- admin product mutations are protected end to end

Relevant files:

- `intelyi-frontend/src/app/api/auth/[...nextauth]/route.ts`
- `intelyi-frontend/src/lib/server/backendProxy.ts`
- `intelyi-backend/app/security.py`

## Recommendation Model

The current recommendation system is deterministic by design.

It uses:

- recency-aware interaction weighting
- personal interaction scoring
- category-affinity boosts
- repeat suppression on overexposed products
- lightweight diversity-aware reranking

The goal is to make recommendations believable and inspectable now, while keeping the system easy to evolve later into stronger ML or bandit-style approaches.

## Development Notes

- The frontend is not the source of truth for business rules.
- Product, order, payment, and ranking logic should remain backend-owned.
- For local work, search/filter/account/cart flows can often be validated without Stripe, but payment confirmation requires Stripe webhook configuration.
- The backend startup still supports optional bootstrap for local convenience, but Alembic should be treated as the migration source of truth going forward.

## Suggested Workflow

1. Start PostgreSQL or point both apps at Neon.
2. Run Prisma migrations in `intelyi-frontend`.
3. Run Alembic migrations in `intelyi-backend`.
4. Start FastAPI on port `8000`.
5. Start Next.js on port `3000`.
6. Load products with the ingestion script if the catalog is empty.
7. Browse the storefront and interact with products to generate recommendation and analytics signals.

## Project Status

This repository is beyond a starter storefront. It currently includes:

- catalog ingestion and normalization
- multi-category product browsing
- signed-in and guest shopping flows
- Stripe-backed checkout lifecycle
- account and order history experience
- backend-owned recommendation and analytics systems

The next layers are likely to be stronger merchandising experimentation, richer customer profile features, and more advanced ranking logic built on the current deterministic foundation.

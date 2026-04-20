from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Cart, CartItem, Order, OrderItem
from ..security import TrustedProxyContext, conflict, get_trusted_proxy_context
from ..schemas import (
    CheckoutInitiationRequest,
    CheckoutSessionCreateRequest,
    CheckoutSessionOut,
    OrderOut,
)
from ..settings import settings
from .cart import get_existing_active_cart, resolve_owner_context

router = APIRouter(prefix="/orders", tags=["orders"])


def append_query_params(url: str, params: dict[str, str]) -> str:
    parsed = urlparse(url)
    query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query_params.update(params)
    return urlunparse(parsed._replace(query=urlencode(query_params)))


def build_order_response(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        user_id=order.user_id,
        session_id=order.session_id,
        source_cart_id=order.source_cart_id,
        status=order.status,
        items=[
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_image_url": item.product_image_url,
                "product_category": item.product_category,
                "product_brand": item.product_brand,
                "quantity": item.quantity,
                "unit_price_cents": item.unit_price_cents,
                "line_subtotal_cents": item.line_subtotal_cents,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in order.items
        ],
        total_item_count=order.total_item_count,
        order_subtotal_cents=order.subtotal_cents,
        paid_at=order.paid_at,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def get_order_query(db: Session):
    return db.query(Order).options(joinedload(Order.items))


def get_order_with_items(db: Session, order_id: str) -> Order | None:
    return get_order_query(db).filter(Order.id == order_id).first()


def claim_guest_order_for_user(db: Session, order: Order, user_id: str) -> Order:
    if order.user_id == user_id:
        return order

    if order.user_id is None:
        order.user_id = user_id
        order.session_id = None
        db.commit()
        refreshed = get_order_with_items(db, order.id)
        if refreshed is not None:
            return refreshed
    return order


def get_order_for_owner(
    db: Session,
    order_id: str,
    user_id: str | None,
    session_id: str | None,
    trusted_user_id: str | None = None,
) -> Order:
    owner_user_id, owner_session_id = resolve_owner_context(
        user_id,
        session_id,
        trusted_user_id=trusted_user_id,
    )
    query = get_order_query(db).filter(Order.id == order_id)

    if owner_user_id:
        order = query.filter(Order.user_id == owner_user_id).first()
        if order is not None:
            return order

        if owner_session_id:
            guest_order = query.filter(Order.session_id == owner_session_id).first()
            if guest_order is not None:
                return claim_guest_order_for_user(db, guest_order, owner_user_id)
    else:
        order = query.filter(Order.session_id == owner_session_id).first()
        if order is not None:
            return order

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")


def build_order_item_snapshots(cart_items: list[CartItem]) -> tuple[list[dict], int, int]:
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create an order from an empty cart",
        )

    item_snapshots: list[dict] = []
    subtotal_cents = 0
    total_item_count = 0

    for item in cart_items:
        if item.product is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart contains products that are no longer available",
            )
        if item.product.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart contains inactive products and cannot be checked out",
            )

        unit_price_cents = item.product.price_cents
        line_subtotal_cents = unit_price_cents * item.quantity
        subtotal_cents += line_subtotal_cents
        total_item_count += item.quantity

        item_snapshots.append(
            {
                "product_id": item.product.id,
                "product_name": item.product.name,
                "product_image_url": item.product.image_url,
                "product_category": item.product.category,
                "product_brand": item.product.brand,
                "quantity": item.quantity,
                "unit_price_cents": unit_price_cents,
                "line_subtotal_cents": line_subtotal_cents,
            }
        )

    return item_snapshots, subtotal_cents, total_item_count


def get_reusable_pending_order(db: Session, cart: Cart, item_snapshots: list[dict]) -> Order | None:
    query = get_order_query(db).filter(
        Order.source_cart_id == cart.id,
        Order.status == "PENDING",
    )

    if cart.user_id:
        candidate_orders = query.filter(Order.user_id == cart.user_id).order_by(Order.created_at.desc()).all()
    else:
        candidate_orders = query.filter(Order.session_id == cart.session_id).order_by(Order.created_at.desc()).all()

    cart_signature = {
        item["product_id"]: (item["quantity"], item["unit_price_cents"])
        for item in item_snapshots
    }

    for candidate_order in candidate_orders:
        order_signature = {
            item.product_id: (item.quantity, item.unit_price_cents)
            for item in candidate_order.items
        }
        if order_signature == cart_signature:
            return candidate_order

    return None


def get_reusable_checkout_session(order: Order) -> CheckoutSessionOut | None:
    if not order.stripe_checkout_session_id:
        return None

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        checkout_session = stripe.checkout.Session.retrieve(order.stripe_checkout_session_id)
    except stripe.error.StripeError:
        return None

    if checkout_session.payment_status == "paid":
        raise conflict("Payment has already been started for this order")

    if checkout_session.status == "open" and checkout_session.url:
        return CheckoutSessionOut(
            order_id=order.id,
            checkout_session_id=checkout_session.id,
            checkout_url=checkout_session.url,
        )

    return None


def require_stripe_configuration():
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured",
        )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order_from_cart(
    payload: CheckoutInitiationRequest,
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    try:
        cart = get_existing_active_cart(
            db,
            user_id=payload.user_id,
            session_id=payload.session_id,
            trusted_user_id=proxy_context.user_id,
        )
    except HTTPException as exc:
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create an order from an empty cart",
            ) from exc
        raise

    item_snapshots, subtotal_cents, total_item_count = build_order_item_snapshots(cart.items)

    existing_pending_order = get_reusable_pending_order(db, cart, item_snapshots)
    if existing_pending_order is not None:
        return build_order_response(existing_pending_order)

    order = Order(
        user_id=cart.user_id,
        session_id=cart.session_id,
        source_cart_id=cart.id,
        status="PENDING",
        subtotal_cents=subtotal_cents,
        total_item_count=total_item_count,
    )
    db.add(order)
    db.flush()

    for item_snapshot in item_snapshots:
        db.add(OrderItem(order_id=order.id, **item_snapshot))

    db.commit()

    created_order = get_order_with_items(db, order.id)
    if created_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load order")
    return build_order_response(created_order)


@router.post("/{order_id}/checkout-session", response_model=CheckoutSessionOut)
def create_checkout_session(
    order_id: str,
    payload: CheckoutSessionCreateRequest,
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    require_stripe_configuration()
    order = get_order_for_owner(
        db,
        order_id,
        payload.user_id,
        payload.session_id,
        trusted_user_id=proxy_context.user_id,
    )

    if order.status != "PENDING":
        raise conflict("Checkout sessions can only be created for pending orders")

    reusable_checkout_session = get_reusable_checkout_session(order)
    if reusable_checkout_session is not None:
        return reusable_checkout_session

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=order.id,
            success_url=append_query_params(
                settings.STRIPE_SUCCESS_URL,
                {"order_id": order.id, "session_id": "{CHECKOUT_SESSION_ID}"},
            ),
            cancel_url=append_query_params(
                settings.STRIPE_CANCEL_URL,
                {"order_id": order.id},
            ),
            metadata={
                "order_id": order.id,
                "owner_type": "user_id" if order.user_id else "session_id",
                "owner_id": order.user_id or order.session_id or "",
            },
            line_items=[
                {
                    "quantity": item.quantity,
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": item.unit_price_cents,
                        "product_data": {
                            "name": item.product_name,
                            "images": [item.product_image_url] if item.product_image_url else [],
                            "metadata": {
                                "product_id": item.product_id,
                                "order_item_id": item.id,
                            },
                        },
                    },
                }
                for item in order.items
            ],
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create Stripe checkout session",
        ) from exc

    order.stripe_checkout_session_id = checkout_session.id
    db.commit()

    if not checkout_session.url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a checkout URL",
        )

    return CheckoutSessionOut(
        order_id=order.id,
        checkout_session_id=checkout_session.id,
        checkout_url=checkout_session.url,
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: str,
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    order = get_order_for_owner(
        db,
        order_id,
        user_id,
        session_id,
        trusted_user_id=proxy_context.user_id,
    )
    return build_order_response(order)


@router.get("", response_model=list[OrderOut])
def list_orders(
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    owner_user_id, owner_session_id = resolve_owner_context(
        user_id,
        session_id,
        trusted_user_id=proxy_context.user_id,
    )

    query = get_order_query(db)
    if owner_user_id:
        if owner_session_id:
            query = query.filter(
                (Order.user_id == owner_user_id) | (Order.session_id == owner_session_id)
            )
        else:
            query = query.filter(Order.user_id == owner_user_id)
    else:
        query = query.filter(Order.session_id == owner_session_id)

    orders = query.order_by(Order.created_at.desc()).all()
    return [build_order_response(order) for order in orders]

from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Cart, CartItem, Interaction, Order
from ..settings import settings

router = APIRouter(prefix="/stripe", tags=["stripe"])


def handle_paid_order(db: Session, order: Order, checkout_session: stripe.checkout.Session):
    if order.status == "PAID":
        if not order.stripe_checkout_session_id:
            order.stripe_checkout_session_id = checkout_session.id
        payment_intent_id = checkout_session.payment_intent
        if isinstance(payment_intent_id, str) and not order.stripe_payment_intent_id:
            order.stripe_payment_intent_id = payment_intent_id
        db.commit()
        return

    if order.status != "PENDING":
        db.commit()
        return

    order.status = "PAID"
    order.paid_at = datetime.now(timezone.utc)
    order.stripe_checkout_session_id = checkout_session.id

    payment_intent_id = checkout_session.payment_intent
    if isinstance(payment_intent_id, str):
        order.stripe_payment_intent_id = payment_intent_id

    for item in order.items:
        db.add(
            Interaction(
                product_id=item.product_id,
                user_id=order.user_id,
                session_id=order.session_id,
                event_type="purchase",
                event_value=item.quantity,
            )
        )

    if order.source_cart_id:
        cart = (
            db.query(Cart)
            .options(joinedload(Cart.items))
            .filter(Cart.id == order.source_cart_id)
            .first()
        )

        if cart is not None and cart.status == "ACTIVE":
            order_item_quantities = {item.product_id: item.quantity for item in order.items}
            for cart_item in list(cart.items):
                ordered_quantity = order_item_quantities.get(cart_item.product_id)
                if ordered_quantity is None:
                    continue

                remaining_quantity = cart_item.quantity - ordered_quantity
                if remaining_quantity > 0:
                    cart_item.quantity = remaining_quantity
                else:
                    db.delete(cart_item)

    db.commit()


@router.post("/webhook")
async def handle_stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook is not configured",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if signature is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature") from exc

    if event["type"] not in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        return {"received": True}

    checkout_session = event["data"]["object"]
    if checkout_session.get("payment_status") != "paid":
        return {"received": True}

    metadata = checkout_session.get("metadata") or {}
    order_id = metadata.get("order_id") or checkout_session.get("client_reference_id")
    if not order_id:
        return {"received": True}

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        return {"received": True}

    handle_paid_order(db, order, checkout_session)
    return {"received": True}

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Cart, CartItem, Interaction, Product
from ..schemas import CartAddItemRequest, CartItemUpdate, CartOut
from ..security import TrustedProxyContext, get_trusted_proxy_context

router = APIRouter(prefix="/cart", tags=["cart"])


def resolve_owner_context(
    user_id: str | None,
    session_id: str | None,
    trusted_user_id: str | None = None,
) -> tuple[str | None, str | None]:
    if trusted_user_id:
        return trusted_user_id, session_id
    if user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user context requires a trusted proxy",
        )
    if session_id:
        return None, session_id
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="user_id or session_id is required",
    )


def get_cart_query(db: Session):
    return (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.product))
        .filter(Cart.status == "ACTIVE")
    )


def merge_session_cart_into_user_cart(db: Session, user_id: str, session_id: str | None) -> None:
    if not session_id:
        return

    user_cart = get_cart_query(db).filter(Cart.user_id == user_id).first()
    session_cart = get_cart_query(db).filter(Cart.session_id == session_id).first()

    if session_cart is None:
        return

    if user_cart is None:
        session_cart.user_id = user_id
        session_cart.session_id = None
        db.flush()
        return

    existing_items = {item.product_id: item for item in user_cart.items}

    for session_item in list(session_cart.items):
        current_item = existing_items.get(session_item.product_id)
        if current_item is None:
            session_item.cart_id = user_cart.id
            if session_item.product is not None:
                session_item.unit_price_cents = session_item.product.price_cents
            existing_items[session_item.product_id] = session_item
            continue

        current_item.quantity += session_item.quantity
        if session_item.product is not None:
            current_item.unit_price_cents = session_item.product.price_cents
        db.delete(session_item)

    db.delete(session_cart)
    db.flush()


def get_active_cart(
    db: Session,
    user_id: str | None,
    session_id: str | None,
    trusted_user_id: str | None = None,
) -> Cart:
    owner_user_id, owner_session_id = resolve_owner_context(user_id, session_id, trusted_user_id=trusted_user_id)

    if owner_user_id:
        merge_session_cart_into_user_cart(db, owner_user_id, owner_session_id)
        cart = get_cart_query(db).filter(Cart.user_id == owner_user_id).first()
        if cart:
            return cart
        cart = Cart(user_id=owner_user_id, session_id=None, status="ACTIVE")
    else:
        cart = get_cart_query(db).filter(Cart.session_id == owner_session_id).first()
        if cart:
            return cart
        cart = Cart(user_id=None, session_id=owner_session_id, status="ACTIVE")

    db.add(cart)
    db.flush()
    db.refresh(cart)
    return get_cart_query(db).filter(Cart.id == cart.id).one()


def get_existing_active_cart(
    db: Session,
    user_id: str | None,
    session_id: str | None,
    trusted_user_id: str | None = None,
) -> Cart:
    owner_user_id, owner_session_id = resolve_owner_context(user_id, session_id, trusted_user_id=trusted_user_id)

    if owner_user_id:
        merge_session_cart_into_user_cart(db, owner_user_id, owner_session_id)
        cart = get_cart_query(db).filter(Cart.user_id == owner_user_id).first()
    else:
        cart = get_cart_query(db).filter(Cart.session_id == owner_session_id).first()

    if cart is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active cart not found")
    return cart


def build_cart_response(cart: Cart) -> CartOut:
    items = []
    cart_subtotal_cents = 0
    total_item_count = 0

    for item in cart.items:
        if item.product is None:
            continue

        line_subtotal_cents = item.quantity * item.unit_price_cents
        cart_subtotal_cents += line_subtotal_cents
        total_item_count += item.quantity
        items.append(
            {
                "id": item.id,
                "quantity": item.quantity,
                "unit_price_cents": item.unit_price_cents,
                "line_subtotal_cents": line_subtotal_cents,
                "product": item.product,
            }
        )

    return CartOut(
        id=cart.id,
        user_id=cart.user_id,
        session_id=cart.session_id,
        status=cart.status,
        items=items,
        total_item_count=total_item_count,
        cart_subtotal_cents=cart_subtotal_cents,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


def get_cart_item_for_context(
    db: Session,
    item_id: str,
    user_id: str | None,
    session_id: str | None,
    trusted_user_id: str | None = None,
) -> tuple[Cart, CartItem]:
    cart = get_existing_active_cart(
        db,
        user_id=user_id,
        session_id=session_id,
        trusted_user_id=trusted_user_id,
    )
    item = next((cart_item for cart_item in cart.items if cart_item.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    return cart, item


@router.get("", response_model=CartOut)
def get_current_cart(
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    cart = get_active_cart(
        db,
        user_id=user_id,
        session_id=session_id,
        trusted_user_id=proxy_context.user_id,
    )
    return build_cart_response(cart)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item_to_cart(
    payload: CartAddItemRequest,
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    product = db.get(Product, payload.product_id)

    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active products can be added")

    cart = get_active_cart(
        db,
        user_id=payload.user_id,
        session_id=payload.session_id,
        trusted_user_id=proxy_context.user_id,
    )

    existing_item = next((item for item in cart.items if item.product_id == product.id), None)
    if existing_item:
        existing_item.quantity += payload.quantity
        existing_item.unit_price_cents = product.price_cents
    else:
        existing_item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            quantity=payload.quantity,
            unit_price_cents=product.price_cents,
        )
        db.add(existing_item)

    db.add(
        Interaction(
            product_id=product.id,
            user_id=cart.user_id,
            session_id=cart.session_id,
            event_type="add_to_cart",
            event_value=payload.quantity,
        )
    )

    db.commit()

    refreshed_cart = get_cart_query(db).filter(Cart.id == cart.id).one()
    return build_cart_response(refreshed_cart)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_cart_item_quantity(
    item_id: str,
    payload: CartItemUpdate,
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    cart, item = get_cart_item_for_context(
        db,
        item_id=item_id,
        user_id=user_id,
        session_id=session_id,
        trusted_user_id=proxy_context.user_id,
    )

    if item.product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found for cart item")
    if item.product.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive products cannot remain in cart")

    item.quantity = payload.quantity
    item.unit_price_cents = item.product.price_cents
    db.commit()

    refreshed_cart = get_cart_query(db).filter(Cart.id == cart.id).one()
    return build_cart_response(refreshed_cart)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: str,
    user_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    proxy_context: TrustedProxyContext = Depends(get_trusted_proxy_context),
):
    cart, item = get_cart_item_for_context(
        db,
        item_id=item_id,
        user_id=user_id,
        session_id=session_id,
        trusted_user_id=proxy_context.user_id,
    )
    db.delete(item)
    db.commit()

    refreshed_cart = get_cart_query(db).filter(Cart.id == cart.id).one()
    return build_cart_response(refreshed_cart)

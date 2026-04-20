from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_product_schema(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS source_dataset VARCHAR(100)"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS source_external_id VARCHAR(255)"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS image_url TEXT"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS category VARCHAR(255)"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS brand VARCHAR(255)"))
        connection.execute(text("DROP INDEX IF EXISTS ix_products_py_source_external_id"))
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_products_py_source_dataset "
                "ON products_py (source_dataset)"
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_products_py_source_dataset_external_id "
                "ON products_py (source_dataset, source_external_id) "
                "WHERE source_external_id IS NOT NULL"
            )
        )


def ensure_cart_schema(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_carts_status ON carts (status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cart_items_cart_id ON cart_items (cart_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cart_items_product_id ON cart_items (product_id)"))


def ensure_order_schema(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255)"))
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)"))
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders (user_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_session_id ON orders (session_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_source_cart_id ON orders (source_cart_id)"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_stripe_checkout_session_id "
                "ON orders (stripe_checkout_session_id) "
                "WHERE stripe_checkout_session_id IS NOT NULL"
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_stripe_payment_intent_id "
                "ON orders (stripe_payment_intent_id) "
                "WHERE stripe_payment_intent_id IS NOT NULL"
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_product_id ON order_items (product_id)"))

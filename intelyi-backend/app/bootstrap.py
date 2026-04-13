from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_product_schema(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS source_external_id VARCHAR(255)"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS image_url TEXT"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS category VARCHAR(255)"))
        connection.execute(text("ALTER TABLE products_py ADD COLUMN IF NOT EXISTS brand VARCHAR(255)"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_py_source_external_id "
                "ON products_py (source_external_id)"
            )
        )


def ensure_cart_schema(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_carts_status ON carts (status)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cart_items_cart_id ON cart_items (cart_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cart_items_product_id ON cart_items (product_id)"))

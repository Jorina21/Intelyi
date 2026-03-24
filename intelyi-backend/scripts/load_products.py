import argparse
import ast
import csv
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR / "intelyi-backend") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "intelyi-backend"))

DEFAULT_LIMIT = 100
PRODUCTS_CSV_PATH = ROOT_DIR / "data" / "raw" / "products.csv"


def parse_args():
    parser = argparse.ArgumentParser(description="Load a clean subset of Amazon products into Intelyi.")
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum number of products to insert. Default: {DEFAULT_LIMIT}",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=PRODUCTS_CSV_PATH,
        help=f"Path to the products CSV file. Default: {PRODUCTS_CSV_PATH}",
    )
    return parser.parse_args()


def normalize_text(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned or None


def normalize_brand(value: str | None) -> str | None:
    cleaned = normalize_text(value)
    if not cleaned:
        return None

    cleaned = re.sub(r"\s+Store$", "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned or None


def parse_price_cents(value: str | None) -> int | None:
    cleaned = normalize_text(value)
    if not cleaned:
        return None

    match = re.search(r"\d+(?:\.\d+)?", cleaned.replace(",", ""))
    if not match:
        return None

    amount = float(match.group(0))
    if amount <= 0:
        return None

    return int(round(amount * 100))


def extract_category(value: str | None) -> str | None:
    cleaned = normalize_text(value)
    if not cleaned:
        return None

    parts = [part.strip() for part in cleaned.split("›") if part.strip()]
    if not parts:
        return cleaned[:255]

    category = parts[-1]
    return category[:255]


def extract_image_url(value: str | None) -> str | None:
    cleaned = normalize_text(value)
    if not cleaned:
        return None

    try:
        parsed = ast.literal_eval(cleaned)
    except (SyntaxError, ValueError):
        return None

    if not isinstance(parsed, list):
        return None

    for item in parsed:
        if isinstance(item, str) and item.startswith("http"):
            return item

    return None


def build_description(row: dict[str, str]) -> str | None:
    for key in ("product_description", "about_item"):
        description = normalize_text(row.get(key))
        if description:
            return description
    return None


def build_external_id(row: dict[str, str], brand: str | None, price_cents: int) -> str | None:
    asin = normalize_text(row.get("asin"))
    if asin:
        return asin

    title = normalize_text(row.get("title"))
    if not title:
        return None

    return f"{title.lower()}::{(brand or '').lower()}::{price_cents}"


def main():
    args = parse_args()
    dataset_path = args.dataset.resolve()

    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")

    if not dataset_path.exists():
        raise SystemExit(f"Dataset not found: {dataset_path}")

    from app.bootstrap import ensure_product_schema
    from app.db import Base, SessionLocal, engine
    from app.models import Product

    Base.metadata.create_all(bind=engine)
    ensure_product_schema(engine)

    with dataset_path.open(newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))

    total_rows = len(rows)
    inserted = 0
    duplicates_ignored = 0
    skipped_missing_title = 0
    skipped_invalid_price = 0
    skipped_missing_description = 0
    skipped_missing_image = 0

    session = SessionLocal()

    try:
        for row in rows:
            if inserted >= args.limit:
                break

            name = normalize_text(row.get("title"))
            if not name:
                skipped_missing_title += 1
                continue

            price_cents = parse_price_cents(row.get("price_value") or row.get("list_price"))
            if price_cents is None:
                skipped_invalid_price += 1
                continue

            description = build_description(row)
            if not description:
                skipped_missing_description += 1
                continue

            image_url = extract_image_url(row.get("all_images"))
            if not image_url:
                skipped_missing_image += 1
                continue

            brand = normalize_brand(row.get("brand_name") or row.get("manufacturer"))
            category = extract_category(row.get("breadcrumbs"))
            source_external_id = build_external_id(row, brand, price_cents)

            duplicate_product = None
            if source_external_id:
                duplicate_product = (
                    session.query(Product)
                    .filter(Product.source_external_id == source_external_id)
                    .first()
                )

            if duplicate_product is None:
                duplicate_product = (
                    session.query(Product)
                    .filter(
                        Product.name == name,
                        Product.brand == brand,
                        Product.price_cents == price_cents,
                    )
                    .first()
                )

            if duplicate_product:
                duplicates_ignored += 1
                continue

            product = Product(
                source_external_id=source_external_id,
                name=name,
                description=description,
                image_url=image_url,
                category=category,
                brand=brand,
                price_cents=price_cents,
                status="ACTIVE",
            )
            session.add(product)
            inserted += 1

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print(f"Dataset used: {dataset_path}")
    print(f"Total rows read: {total_rows}")
    print(f"Rows inserted: {inserted}")
    print(f"Duplicates ignored: {duplicates_ignored}")
    print(f"Rows skipped (missing title): {skipped_missing_title}")
    print(f"Rows skipped (invalid price): {skipped_invalid_price}")
    print(f"Rows skipped (missing description): {skipped_missing_description}")
    print(f"Rows skipped (missing image): {skipped_missing_image}")


if __name__ == "__main__":
    main()

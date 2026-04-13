import argparse
import ast
import csv
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR / "intelyi-backend") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "intelyi-backend"))

DEFAULT_LIMIT = 100
DEFAULT_MAX_PER_CATEGORY = 5
PRODUCTS_CSV_PATH = ROOT_DIR / "data" / "raw" / "products.csv"
BREADCRUMB_SEPARATORS = ("›", ">")
AUDIENCE_LABELS = (
    ("baby girls", "Baby Girls"),
    ("baby boys", "Baby Boys"),
    ("women", "Women"),
    ("men", "Men"),
    ("girls", "Girls"),
    ("boys", "Boys"),
    ("baby", "Baby"),
)
NON_APPAREL_MARKERS = {
    "shoes",
    "jewelry",
    "handbags",
    "wallets",
    "watches",
    "luggage",
    "sunglasses",
    "eyewear",
    "booties",
}
CATEGORY_RULES = (
    (
        "Outerwear",
        (
            "jackets & coats",
            "outerwear",
            "windbreakers",
            "shells",
            "fleece",
            "trench & rain",
            "insulated",
            "down & down alternative",
            "wool & blends",
            "lightweight jackets",
            "jackets",
            "skiing",
        ),
    ),
    (
        "Dresses",
        (
            "dresses",
        ),
    ),
    (
        "Sweatshirts & Hoodies",
        (
            "active sweatshirts",
            "active hoodies",
            "fashion hoodies & sweatshirts",
            "sweatshirts",
        ),
    ),
    (
        "Active Tops",
        (
            "active shirts & tees",
        ),
    ),
    (
        "Tops",
        (
            "shirts",
            "blouses & button-down shirts",
            "tops, tees & blouses",
            "tops, tees & shirts",
            "tank tops",
            "tunics",
            "tops",
            "bodysuits",
            "jumpsuits, rompers & overalls",
        ),
    ),
    (
        "Jeans",
        (
            "jeans",
        ),
    ),
    (
        "Active Pants",
        (
            "active pants",
        ),
    ),
    (
        "Pants",
        (
            "pants",
            "leggings",
            "joggers",
        ),
    ),
    (
        "Shorts",
        (
            "shorts",
            "board shorts",
            "cargo",
            "flat front",
            "compression shorts",
        ),
    ),
    (
        "Underwear",
        (
            "underwear",
            "boxer briefs",
            "boxers",
            "briefs",
            "undershirts",
            "base layers & compression",
            "socks",
            "footies",
        ),
    ),
    (
        "Sleepwear",
        (
            "sleep & lounge",
            "sleepwear & robes",
        ),
    ),
    (
        "Swimwear",
        (
            "swim",
        ),
    ),
    (
        "Suits",
        (
            "suits & sport coats",
            "suit separates",
        ),
    ),
    (
        "Sets",
        (
            "clothing sets",
            "pant sets",
            "tracksuits",
            "sets",
        ),
    ),
)


@dataclass(frozen=True)
class PreparedProduct:
    row_number: int
    source_external_id: str | None
    name: str
    description: str
    image_url: str
    category: str
    brand: str | None
    price_cents: int


def parse_args():
    parser = argparse.ArgumentParser(description="Load a balanced apparel subset of Amazon products into Intelyi.")
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum number of products to insert. Default: {DEFAULT_LIMIT}",
    )
    parser.add_argument(
        "--max-per-category",
        type=int,
        default=DEFAULT_MAX_PER_CATEGORY,
        help=(
            "Maximum number of inserted products per normalized apparel category. "
            f"Default: {DEFAULT_MAX_PER_CATEGORY}"
        ),
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=PRODUCTS_CSV_PATH,
        help=f"Path to the products CSV file. Default: {PRODUCTS_CSV_PATH}",
    )
    return parser.parse_args()


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = unicodedata.normalize("NFKC", value)
    cleaned = cleaned.replace("\u00a0", " ")
    cleaned = cleaned.replace("\u2019", "'")
    cleaned = cleaned.replace("\u2018", "'")
    cleaned = cleaned.replace("\u201c", '"')
    cleaned = cleaned.replace("\u201d", '"')
    cleaned = cleaned.replace("\ufeff", "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
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


def normalize_breadcrumb_parts(value: str | None) -> list[str]:
    cleaned = normalize_text(value)
    if not cleaned:
        return []

    normalized = cleaned
    for separator in BREADCRUMB_SEPARATORS:
        normalized = normalized.replace(separator, "›")

    parts = [normalize_text(part) for part in normalized.split("›")]
    return [part for part in parts if part]


def format_audience_label(audience: str | None) -> str | None:
    if not audience:
        return None
    if audience == "Baby":
        return "Baby"
    return f"{audience}'s" if not audience.endswith("s") else f"{audience}'"


def extract_audience(lowered_parts: list[str]) -> str | None:
    for value, label in AUDIENCE_LABELS:
        if value in lowered_parts:
            return label
    return None


def extract_category(value: str | None) -> str | None:
    parts = normalize_breadcrumb_parts(value)
    if not parts:
        return None

    lowered_parts = [part.casefold() for part in parts]
    clothing_indexes = [index for index, part in enumerate(lowered_parts) if "clothing" in part]
    if not clothing_indexes:
        return None
    clothing_index = clothing_indexes[-1]

    scoped_parts = parts[clothing_index:]
    scoped_lower = lowered_parts[clothing_index:]
    joined_path = " | ".join(scoped_lower)
    audience_label = format_audience_label(extract_audience(lowered_parts))

    if any(marker in joined_path for marker in NON_APPAREL_MARKERS):
        return None

    family = None
    for category, keywords in CATEGORY_RULES:
        if any(keyword in joined_path for keyword in keywords):
            family = category
            break

    if family:
        if audience_label == "Baby":
            return f"{audience_label} {family}"[:255]
        if audience_label:
            return f"{audience_label} {family}"[:255]
        return family[:255]

    if len(scoped_parts) >= 2:
        fallback = scoped_parts[1][:255]
        if audience_label == "Baby":
            return f"{audience_label} {fallback}"[:255]
        if audience_label:
            return f"{audience_label} {fallback}"[:255]
        return fallback

    if audience_label == "Baby":
        return "Baby Apparel"
    if audience_label:
        return f"{audience_label} Apparel"[:255]
    return "Apparel"


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


def build_candidate(row_number: int, row: dict[str, str], counters: Counter[str]) -> PreparedProduct | None:
    name = normalize_text(row.get("title"))
    if not name:
        counters["missing_title"] += 1
        return None

    price_cents = parse_price_cents(row.get("price_value") or row.get("list_price"))
    if price_cents is None:
        counters["invalid_price"] += 1
        return None

    description = build_description(row)
    if not description:
        counters["missing_description"] += 1
        return None

    image_url = extract_image_url(row.get("all_images"))
    if not image_url:
        counters["missing_image"] += 1
        return None

    brand = normalize_brand(row.get("brand_name") or row.get("manufacturer"))
    category = extract_category(row.get("breadcrumbs"))
    if not category:
        counters["non_apparel"] += 1
        return None

    source_external_id = build_external_id(row, brand, price_cents)
    return PreparedProduct(
        row_number=row_number,
        source_external_id=source_external_id,
        name=name,
        description=description,
        image_url=image_url,
        category=category,
        brand=brand,
        price_cents=price_cents,
    )


def group_candidates(rows: list[dict[str, str]]) -> tuple[dict[str, list[PreparedProduct]], Counter[str]]:
    counters: Counter[str] = Counter()
    buckets: dict[str, list[PreparedProduct]] = defaultdict(list)

    for row_number, row in enumerate(rows, start=2):
        candidate = build_candidate(row_number, row, counters)
        if candidate is None:
            continue
        buckets[candidate.category].append(candidate)

    return dict(buckets), counters


def build_balanced_candidate_queue(buckets: dict[str, list[PreparedProduct]]) -> list[PreparedProduct]:
    queue: list[PreparedProduct] = []
    positions = {category: 0 for category in buckets}
    ordered_categories = sorted(buckets)

    while True:
        made_progress = False

        for category in ordered_categories:
            category_bucket = buckets[category]
            position = positions[category]
            if position >= len(category_bucket):
                continue

            queue.append(category_bucket[position])
            positions[category] += 1
            made_progress = True

        if not made_progress:
            break

    return queue


def main():
    args = parse_args()
    dataset_path = args.dataset.resolve()

    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")
    if args.max_per_category < 1:
        raise SystemExit("--max-per-category must be at least 1")
    if not dataset_path.exists():
        raise SystemExit(f"Dataset not found: {dataset_path}")

    from app.bootstrap import ensure_product_schema
    from app.db import Base, SessionLocal, engine
    from app.models import Product

    Base.metadata.create_all(bind=engine)
    ensure_product_schema(engine)

    with dataset_path.open(newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))

    category_buckets, skipped_counters = group_candidates(rows)
    balanced_candidates = build_balanced_candidate_queue(category_buckets)

    total_rows = len(rows)
    duplicates_ignored = 0
    inserted = 0
    inserted_per_category: Counter[str] = Counter()

    session = SessionLocal()

    try:
        for candidate in balanced_candidates:
            if inserted >= args.limit:
                break

            if inserted_per_category[candidate.category] >= args.max_per_category:
                continue

            duplicate_product = None
            if candidate.source_external_id:
                duplicate_product = (
                    session.query(Product)
                    .filter(Product.source_external_id == candidate.source_external_id)
                    .first()
                )

            if duplicate_product is None:
                duplicate_product = (
                    session.query(Product)
                    .filter(
                        Product.name == candidate.name,
                        Product.brand == candidate.brand,
                        Product.price_cents == candidate.price_cents,
                    )
                    .first()
                )

            if duplicate_product:
                duplicates_ignored += 1
                continue

            product = Product(
                source_external_id=candidate.source_external_id,
                name=candidate.name,
                description=candidate.description,
                image_url=candidate.image_url,
                category=candidate.category,
                brand=candidate.brand,
                price_cents=candidate.price_cents,
                status="ACTIVE",
            )
            session.add(product)
            inserted += 1
            inserted_per_category[candidate.category] += 1

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print(f"Dataset used: {dataset_path}")
    print(f"Total rows read: {total_rows}")
    print(f"Configured total limit: {args.limit}")
    print(f"Configured per-category cap: {args.max_per_category}")
    print(f"Normalized apparel categories discovered: {len(category_buckets)}")
    print(f"Balanced candidate queue size: {len(balanced_candidates)}")
    print(f"Rows inserted: {inserted}")
    print(f"Duplicates ignored: {duplicates_ignored}")
    print(f"Rows skipped (missing title): {skipped_counters['missing_title']}")
    print(f"Rows skipped (invalid price): {skipped_counters['invalid_price']}")
    print(f"Rows skipped (missing description): {skipped_counters['missing_description']}")
    print(f"Rows skipped (missing image): {skipped_counters['missing_image']}")
    print(f"Rows skipped (non-apparel or unusable category): {skipped_counters['non_apparel']}")
    print("Inserted rows by category:")
    if inserted_per_category:
        for category in sorted(inserted_per_category):
            print(f"  {category}: {inserted_per_category[category]}")
    else:
        print("  none")


if __name__ == "__main__":
    main()

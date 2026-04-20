import argparse
import ast
import csv
import re
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR / "intelyi-backend") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "intelyi-backend"))

DEFAULT_LIMIT = 100
DEFAULT_MAX_PER_CATEGORY = 5
APPAREL_DATASET_KEY = "amazon_apparel"
AMAZON_PRODUCTS_2023_DATASET_KEY = "amazon_products_2023"
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
APPAREL_CATEGORY_RULES = (
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
    ("Dresses", ("dresses",)),
    (
        "Sweatshirts & Hoodies",
        ("active sweatshirts", "active hoodies", "fashion hoodies & sweatshirts", "sweatshirts"),
    ),
    ("Active Tops", ("active shirts & tees",)),
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
    ("Jeans", ("jeans",)),
    ("Active Pants", ("active pants",)),
    ("Pants", ("pants", "leggings", "joggers")),
    ("Shorts", ("shorts", "board shorts", "cargo", "flat front", "compression shorts")),
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
    ("Sleepwear", ("sleep & lounge", "sleepwear & robes")),
    ("Swimwear", ("swim",)),
    ("Suits", ("suits & sport coats", "suit separates")),
    ("Sets", ("clothing sets", "pant sets", "tracksuits", "sets")),
)
BOOK_KEYWORDS = (
    "book",
    "books",
    "novel",
    "story",
    "stories",
    "paperback",
    "hardcover",
    "illustrated",
    "workbook",
    "guide",
)
BEAUTY_KEYWORDS = (
    "sunscreen",
    "serum",
    "cream",
    "lotion",
    "soap",
    "fragrance",
    "perfume",
    "lip",
    "skin",
    "shampoo",
    "conditioner",
    "mask",
    "oil",
)
ACCESSORY_KEYWORDS = (
    "strap",
    "watch band",
    "watch",
    "jewellery",
    "jewelry",
    "necklace",
    "ring",
    "scrunchies",
    "hair band",
    "glasses",
    "earmuffs",
    "wallet",
    "bag",
    "luggage",
    "pouch",
    "backpack",
)
BABY_KEYWORDS = (
    "baby",
    "new born",
    "newborn",
    "infant",
    "toddler",
    "feeding bottle",
    "bather",
    "diaper",
)
TOY_KEYWORDS = (
    "toy",
    "puzzle",
    "game",
    "lego",
    "doll",
    "rc car",
    "playset",
)
ELECTRONICS_KEYWORDS = (
    "smart watch",
    "watch faces",
    "display",
    "bluetooth",
    "speaker",
    "headphone",
    "earphones",
    "gaming console",
    "playstation",
    "ps5",
    "smart glasses",
)
HOME_KEYWORDS = (
    "bottle",
    "organizer",
    "storage box",
    "shoe polish",
    "mosquito",
    "repellent",
    "dust cover",
    "water bottle",
    "kitchen",
    "cleaner",
)
VIDEO_GAME_KEYWORDS = (
    "pc game",
    "video game",
    "playstation",
    "xbox",
    "nintendo",
    "gta 5",
)
SPORTS_KEYWORDS = (
    "sports",
    "gym",
    "workout",
    "running",
    "fitness",
    "yoga",
)
INTIMATE_KEYWORDS = (
    "bra",
    "bikini",
    "panty",
    "panties",
    "nipple cover",
    "lingerie",
)
UNDERWEAR_KEYWORDS = (
    "brief",
    "boxer",
    "vest",
    "innerwear",
    "undershirt",
    "trunk",
)


@dataclass(frozen=True)
class DatasetConfig:
    key: str
    label: str
    format: str
    path: Path
    zip_member: str | None = None
    glob_pattern: str | None = None


@dataclass(frozen=True)
class PreparedProduct:
    row_number: int
    source_dataset: str
    source_external_id: str | None
    name: str
    description: str
    image_url: str
    category: str
    brand: str | None
    price_cents: int


DATASET_CONFIGS = {
    APPAREL_DATASET_KEY: DatasetConfig(
        key=APPAREL_DATASET_KEY,
        label="Existing apparel Amazon CSV",
        format="csv",
        path=ROOT_DIR / "data" / "raw" / "products.csv",
    ),
    AMAZON_PRODUCTS_2023_DATASET_KEY: DatasetConfig(
        key=AMAZON_PRODUCTS_2023_DATASET_KEY,
        label="Amazon Products Sales Dataset 2023 (unzipped directory)",
        format="csv_dir",
        path=ROOT_DIR / "data" / "amazon_dataset",
        glob_pattern="*.csv",
    ),
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Load a balanced, normalized product subset from a supported dataset into Intelyi."
    )
    parser.add_argument(
        "--dataset",
        choices=sorted(DATASET_CONFIGS),
        default=APPAREL_DATASET_KEY,
        help=f"Dataset key to ingest. Default: {APPAREL_DATASET_KEY}",
    )
    parser.add_argument(
        "--dataset-path",
        type=Path,
        default=None,
        help="Optional override path for the selected dataset file.",
    )
    parser.add_argument(
        "--zip-member",
        default=None,
        help="Optional override CSV member when ingesting from a zip archive.",
    )
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
            "Maximum number of inserted products per normalized category. "
            f"Default: {DEFAULT_MAX_PER_CATEGORY}"
        ),
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


def normalize_apparel_category(value: str | None) -> str | None:
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
    for category, keywords in APPAREL_CATEGORY_RULES:
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

    if cleaned.startswith("http"):
        return cleaned

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


def build_apparel_description(row: dict[str, str]) -> str | None:
    for key in ("product_description", "about_item"):
        description = normalize_text(row.get(key))
        if description:
            return description
    return None


def contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


def normalize_marketplace_category(row: dict[str, str]) -> str | None:
    main_category = normalize_text(row.get("main_category"))
    sub_category = normalize_text(row.get("sub_category"))
    name = normalize_text(row.get("name"))
    lowered_main = (main_category or "").casefold()
    lowered_sub = (sub_category or "").casefold()
    lowered_name = (name or "").casefold()
    combined = " | ".join(value for value in (lowered_main, lowered_sub, lowered_name) if value)

    if not combined:
        return None

    if contains_any(combined, BOOK_KEYWORDS):
        return "Books"
    if contains_any(combined, VIDEO_GAME_KEYWORDS):
        return "Video Games"
    if contains_any(combined, ELECTRONICS_KEYWORDS):
        return "Electronics"
    if contains_any(combined, HOME_KEYWORDS):
        return "Home & Kitchen"
    if contains_any(combined, SPORTS_KEYWORDS):
        return "Sports & Fitness"
    if lowered_main == "appliances":
        return "Appliances"
    if lowered_main == "tv, audio & cameras":
        return "Electronics"
    if lowered_main == "car & motorbike":
        return "Automotive"
    if lowered_main in {"bags & luggage", "accessories"}:
        return "Accessories"
    if lowered_main == "beauty & health":
        return "Beauty & Personal Care"
    if lowered_main == "grocery & gourmet foods":
        return "Grocery"
    if lowered_main in {"home & kitchen", "home, kitchen, pets"}:
        if "pet" in combined or "dog" in combined or "cat" in combined:
            return "Pet Supplies"
        return "Home & Kitchen"
    if lowered_main == "industrial supplies":
        return "Office & Industrial"
    if lowered_main == "kids' fashion":
        return "Kids' Fashion"
    if lowered_main == "men's clothing":
        if "innerwear" in lowered_sub or contains_any(combined, UNDERWEAR_KEYWORDS):
            return "Men's Underwear"
        return "Men's Apparel"
    if lowered_main == "women's clothing":
        if contains_any(combined, INTIMATE_KEYWORDS):
            return "Women's Intimates"
        return "Women's Apparel"
    if lowered_main == "men's shoes":
        return "Men's Shoes"
    if lowered_main == "women's shoes":
        return "Women's Shoes"
    if lowered_main == "music":
        return "Musical Instruments"
    if lowered_main == "pet supplies":
        return "Pet Supplies"
    if lowered_main == "sports & fitness":
        return "Sports & Fitness"
    if lowered_main == "toys & baby products":
        if contains_any(combined, BABY_KEYWORDS):
            return "Baby"
        if contains_any(combined, TOY_KEYWORDS):
            return "Toys & Games"
        return "Baby & Kids"
    if lowered_main == "stores":
        if contains_any(combined, BEAUTY_KEYWORDS):
            return "Beauty & Personal Care"
        if contains_any(combined, ACCESSORY_KEYWORDS):
            return "Accessories"
        if contains_any(combined, BABY_KEYWORDS):
            return "Baby"
        if contains_any(combined, HOME_KEYWORDS):
            return "Home & Kitchen"
        if contains_any(combined, SPORTS_KEYWORDS):
            return "Sports & Fitness"
        return "General Merchandise"
    return None


def build_marketplace_description(row: dict[str, str], category: str | None) -> str | None:
    name = normalize_text(row.get("name"))
    main_category = normalize_text(row.get("main_category"))
    sub_category = normalize_text(row.get("sub_category"))
    rating = normalize_text(row.get("ratings"))
    rating_count = normalize_text(row.get("no_of_ratings"))

    if not name:
        return None

    parts = [name]
    if category:
        parts.append(f"Normalized category: {category}.")
    elif sub_category:
        parts.append(f"Source category: {sub_category}.")
    elif main_category:
        parts.append(f"Source category: {main_category}.")

    if rating and rating_count:
        parts.append(f"Source listing rating {rating}/5 from {rating_count} ratings.")
    elif rating:
        parts.append(f"Source listing rating {rating}/5.")

    return " ".join(parts)[:1000]


def extract_marketplace_external_id(row: dict[str, str]) -> str | None:
    link = normalize_text(row.get("link"))
    if not link:
        return None

    match = re.search(r"/dp/([A-Z0-9]{10})", link, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper()

    match = re.search(r"/gp/product/([A-Z0-9]{10})", link, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper()

    return link[:255]


def is_placeholder_marketplace_file(path: Path) -> bool:
    try:
        return path.stat().st_size <= 128
    except FileNotFoundError:
        return True


def build_fallback_external_id(name: str, brand: str | None, price_cents: int) -> str:
    return f"{name.lower()}::{(brand or '').lower()}::{price_cents}"[:255]


def build_apparel_candidate(row_number: int, row: dict[str, str], counters: Counter[str]) -> PreparedProduct | None:
    name = normalize_text(row.get("title"))
    if not name:
        counters["missing_title"] += 1
        return None

    price_cents = parse_price_cents(row.get("price_value") or row.get("list_price"))
    if price_cents is None:
        counters["invalid_price"] += 1
        return None

    description = build_apparel_description(row)
    if not description:
        counters["missing_description"] += 1
        return None

    image_url = extract_image_url(row.get("all_images"))
    if not image_url:
        counters["missing_image"] += 1
        return None

    brand = normalize_brand(row.get("brand_name") or row.get("manufacturer"))
    category = normalize_apparel_category(row.get("breadcrumbs"))
    if not category:
        counters["unusable_category"] += 1
        return None

    source_external_id = normalize_text(row.get("asin"))
    if not source_external_id:
        source_external_id = build_fallback_external_id(name, brand, price_cents)

    return PreparedProduct(
        row_number=row_number,
        source_dataset=APPAREL_DATASET_KEY,
        source_external_id=source_external_id,
        name=name,
        description=description,
        image_url=image_url,
        category=category,
        brand=brand,
        price_cents=price_cents,
    )


def build_marketplace_candidate(row_number: int, row: dict[str, str], counters: Counter[str]) -> PreparedProduct | None:
    name = normalize_text(row.get("name"))
    if not name:
        counters["missing_title"] += 1
        return None

    price_cents = parse_price_cents(row.get("discount_price") or row.get("actual_price"))
    if price_cents is None:
        counters["invalid_price"] += 1
        return None

    image_url = extract_image_url(row.get("image"))
    if not image_url:
        counters["missing_image"] += 1
        return None

    category = normalize_marketplace_category(row)
    if not category:
        counters["unusable_category"] += 1
        return None

    description = build_marketplace_description(row, category)
    if not description:
        counters["missing_description"] += 1
        return None

    brand = None
    source_external_id = extract_marketplace_external_id(row) or build_fallback_external_id(name, brand, price_cents)

    return PreparedProduct(
        row_number=row_number,
        source_dataset=AMAZON_PRODUCTS_2023_DATASET_KEY,
        source_external_id=source_external_id,
        name=name,
        description=description,
        image_url=image_url,
        category=category,
        brand=brand,
        price_cents=price_cents,
    )


def build_candidate(
    dataset_key: str, row_number: int, row: dict[str, str], counters: Counter[str]
) -> PreparedProduct | None:
    if dataset_key == APPAREL_DATASET_KEY:
        return build_apparel_candidate(row_number, row, counters)
    if dataset_key == AMAZON_PRODUCTS_2023_DATASET_KEY:
        return build_marketplace_candidate(row_number, row, counters)
    raise ValueError(f"Unsupported dataset key: {dataset_key}")


def iterate_dataset_rows(config: DatasetConfig):
    if config.format == "csv":
        with config.path.open(newline="", encoding="utf-8") as csv_file:
            yield from csv.DictReader(csv_file)
        return

    if config.format == "zip_csv":
        if not config.zip_member:
            raise ValueError(f"Zip dataset {config.key} is missing a zip_member")
        with zipfile.ZipFile(config.path) as archive:
            with archive.open(config.zip_member) as zipped_csv:
                decoded_rows = (line.decode("utf-8", errors="replace") for line in zipped_csv)
                yield from csv.DictReader(decoded_rows)
        return

    if config.format == "csv_dir":
        pattern = config.glob_pattern or "*.csv"
        for path in sorted(config.path.glob(pattern)):
            if path.name == "archive.zip":
                continue
            if is_placeholder_marketplace_file(path):
                continue
            with path.open(newline="", encoding="utf-8", errors="replace") as csv_file:
                yield from csv.DictReader(csv_file)
        return

    raise ValueError(f"Unsupported dataset format: {config.format}")


def list_dataset_sources(config: DatasetConfig) -> list[str]:
    if config.format == "csv":
        return [config.path.name]
    if config.format == "zip_csv":
        return [config.zip_member] if config.zip_member else []
    if config.format == "csv_dir":
        pattern = config.glob_pattern or "*.csv"
        return [
            path.name
            for path in sorted(config.path.glob(pattern))
            if path.name != "archive.zip" and not is_placeholder_marketplace_file(path)
        ]
    return []


def group_candidates(config: DatasetConfig) -> tuple[dict[str, list[PreparedProduct]], Counter[str], int]:
    counters: Counter[str] = Counter()
    buckets: dict[str, list[PreparedProduct]] = defaultdict(list)
    total_rows = 0

    for row_number, row in enumerate(iterate_dataset_rows(config), start=2):
        total_rows += 1
        candidate = build_candidate(config.key, row_number, row, counters)
        if candidate is None:
            continue
        buckets[candidate.category].append(candidate)

    return dict(buckets), counters, total_rows


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


def resolve_dataset_config(args) -> DatasetConfig:
    selected = DATASET_CONFIGS[args.dataset]
    dataset_path = args.dataset_path.resolve() if args.dataset_path else selected.path.resolve()
    zip_member = args.zip_member or selected.zip_member
    return DatasetConfig(
        key=selected.key,
        label=selected.label,
        format=selected.format,
        path=dataset_path,
        zip_member=zip_member,
        glob_pattern=selected.glob_pattern,
    )


def main():
    args = parse_args()
    config = resolve_dataset_config(args)

    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")
    if args.max_per_category < 1:
        raise SystemExit("--max-per-category must be at least 1")
    if not config.path.exists():
        raise SystemExit(f"Dataset not found: {config.path}")
    if config.format == "zip_csv" and not config.zip_member:
        raise SystemExit("--zip-member is required for zip-based datasets")
    if config.format == "csv_dir" and not config.path.is_dir():
        raise SystemExit(f"Expected a directory dataset path for {config.key}: {config.path}")

    from app.bootstrap import ensure_product_schema
    from app.db import Base, SessionLocal, engine
    from app.models import Product

    Base.metadata.create_all(bind=engine)
    ensure_product_schema(engine)

    source_files = list_dataset_sources(config)
    category_buckets, skipped_counters, total_rows = group_candidates(config)
    balanced_candidates = build_balanced_candidate_queue(category_buckets)

    duplicates_ignored = 0
    inserted = 0
    inserted_per_category: Counter[str] = Counter()
    inserted_per_dataset: Counter[str] = Counter()
    seen_external_ids: set[tuple[str, str]] = set()
    seen_fallback_keys: set[tuple[str, str | None, int]] = set()

    session = SessionLocal()

    try:
        for candidate in balanced_candidates:
            if inserted >= args.limit:
                break

            if inserted_per_category[candidate.category] >= args.max_per_category:
                continue

            if candidate.source_external_id:
                scoped_external_id = (candidate.source_dataset, candidate.source_external_id)
                if scoped_external_id in seen_external_ids:
                    duplicates_ignored += 1
                    continue

            fallback_key = (candidate.name, candidate.brand, candidate.price_cents)
            if fallback_key in seen_fallback_keys:
                duplicates_ignored += 1
                continue

            duplicate_product = None
            if candidate.source_external_id:
                duplicate_product = (
                    session.query(Product)
                    .filter(
                        Product.source_dataset == candidate.source_dataset,
                        Product.source_external_id == candidate.source_external_id,
                    )
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
                source_dataset=candidate.source_dataset,
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
            inserted_per_dataset[candidate.source_dataset] += 1

            if candidate.source_external_id:
                seen_external_ids.add((candidate.source_dataset, candidate.source_external_id))
            seen_fallback_keys.add(fallback_key)

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print(f"Dataset key: {config.key}")
    print(f"Dataset label: {config.label}")
    print(f"Dataset file: {config.path}")
    if config.zip_member:
        print(f"Dataset member: {config.zip_member}")
    if source_files:
        print(f"Dataset source files used: {len(source_files)}")
        for name in source_files[:15]:
            print(f"  {name}")
        if len(source_files) > 15:
            print(f"  ... {len(source_files) - 15} more")
    print(f"Total rows read: {total_rows}")
    print(f"Configured total limit: {args.limit}")
    print(f"Configured per-category cap: {args.max_per_category}")
    print(f"Normalized categories discovered: {len(category_buckets)}")
    print(f"Balanced candidate queue size: {len(balanced_candidates)}")
    print(f"Rows inserted: {inserted}")
    print(f"Duplicates ignored: {duplicates_ignored}")
    print(f"Rows skipped (missing title): {skipped_counters['missing_title']}")
    print(f"Rows skipped (invalid price): {skipped_counters['invalid_price']}")
    print(f"Rows skipped (missing description): {skipped_counters['missing_description']}")
    print(f"Rows skipped (missing image): {skipped_counters['missing_image']}")
    print(f"Rows skipped (unusable category): {skipped_counters['unusable_category']}")
    print("Inserted rows by category:")
    if inserted_per_category:
        for category in sorted(inserted_per_category):
            print(f"  {category}: {inserted_per_category[category]}")
    else:
        print("  none")
    print("Inserted rows by source dataset:")
    if inserted_per_dataset:
        for dataset_key in sorted(inserted_per_dataset):
            print(f"  {dataset_key}: {inserted_per_dataset[dataset_key]}")
    else:
        print("  none")


if __name__ == "__main__":
    main()

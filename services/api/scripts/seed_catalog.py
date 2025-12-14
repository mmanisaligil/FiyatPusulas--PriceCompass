import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.models import CanonicalCategory, CanonicalProduct, ProductAlias, MatchSource
from app.services.er import normalize_text


PRODUCTS = [
    ("Sut", ["Gunluk Sut 1L", "UHT Sut 1L"]),
    ("Yag", ["Aycicek Yagi 1L", "Zeytinyagi 1L"]),
    ("Seker", ["Kristal Seker 1kg"]),
    ("Domates", ["Domates kg"]),
    ("Makarna", ["Spagetti 500g", "Burgu 500g"]),
    ("Yumurta", ["Yumurta 30lu"]),
    ("Ekmek", ["Ekmek 500g"]),
    ("Cay", ["Siyah Cay 500g"]),
    ("Kahve", ["Filtre Kahve 250g"]),
    ("Soda", ["Soda 6li"]),
]


async def main():
    async with async_session_maker() as session:  # type: AsyncSession
        await seed_catalog(session)


async def seed_catalog(session: AsyncSession):
    categories: list[CanonicalCategory] = []
    products: list[CanonicalProduct] = []
    aliases: list[ProductAlias] = []
    for name, examples in PRODUCTS:
        category = CanonicalCategory(name_tr=name, weight_factor=1.0)
        categories.append(category)
        for example in examples:
            product = CanonicalProduct(name_tr=example, base_unit="unit", category=category)
            products.append(product)
            aliases.append(
                ProductAlias(
                    raw_text_normalized=normalize_text(example),
                    canonical_product_id=product.id,
                    match_source=MatchSource.EXACT,
                    confidence=0.95,
                )
            )
    session.add_all(categories + products + aliases)
    await session.commit()
    print(f"Seeded {len(products)} products and {len(aliases)} aliases")


if __name__ == "__main__":
    asyncio.run(main())

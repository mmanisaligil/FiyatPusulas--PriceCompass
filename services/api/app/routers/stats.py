from collections import defaultdict
from datetime import date
from statistics import median

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.models import (
    CanonicalCategory,
    CanonicalProduct,
    ExtractedLineItem,
    PersonalInflationSnapshot,
    ResolutionStatus,
    InflationBaseline,
)

router = APIRouter()


def compute_index(records: list[tuple[str, float]]) -> dict:
    if not records:
        return {"value": None, "sample_count": 0, "warning": "no_data"}
    category_prices: dict[str, list[float]] = defaultdict(list)
    for category_name, price in records:
        category_prices[category_name].append(price)
    medians = [median(values) for values in category_prices.values() if values]
    if not medians:
        return {"value": None, "sample_count": len(records), "warning": "no_medians"}
    basket_index = sum(medians) / len(medians)
    return {"value": basket_index, "sample_count": len(records)}


@router.get("/personal")
async def personal_stats(
    x_user_hash: str = Header(..., alias="X-User-Hash"), session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(CanonicalCategory.name_tr, ExtractedLineItem.detected_price)
        .join(CanonicalProduct, CanonicalProduct.id == ExtractedLineItem.canonical_product_id)
        .join(CanonicalCategory, CanonicalProduct.category_id == CanonicalCategory.id)
        .where(
            ExtractedLineItem.resolution_status.in_(
                [ResolutionStatus.AUTO_RESOLVED, ResolutionStatus.USER_CONFIRMED, ResolutionStatus.BARCODE_LINKED]
            ),
            ExtractedLineItem.detected_price.is_not(None),
            ExtractedLineItem.receipt.has(user_hash_key=x_user_hash),
        )
    )
    records = [(row[0], float(row[1])) for row in result.all()]
    index = compute_index(records)
    index["baselines"] = await load_baselines(session)
    return index


@router.get("/public")
async def public_stats(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(CanonicalCategory.name_tr, ExtractedLineItem.detected_price)
        .join(CanonicalProduct, CanonicalProduct.id == ExtractedLineItem.canonical_product_id)
        .join(CanonicalCategory, CanonicalProduct.category_id == CanonicalCategory.id)
        .where(
            ExtractedLineItem.resolution_status.in_(
                [ResolutionStatus.AUTO_RESOLVED, ResolutionStatus.USER_CONFIRMED, ResolutionStatus.BARCODE_LINKED]
            ),
            ExtractedLineItem.detected_price.is_not(None),
        )
    )
    records = [(row[0], float(row[1])) for row in result.all()]
    index = compute_index(records)
    index["baselines"] = await load_baselines(session)
    return index


async def load_baselines(session: AsyncSession):
    result = await session.execute(select(InflationBaseline))
    baselines = []
    for baseline in result.scalars().all():
        baselines.append(
            {
                "source": baseline.source_name,
                "period_date": baseline.period_date.isoformat(),
                "cpi_value": float(baseline.cpi_value) if baseline.cpi_value is not None else None,
                "yoy_change": float(baseline.yoy_change) if baseline.yoy_change is not None else None,
                "mom_change": float(baseline.mom_change) if baseline.mom_change is not None else None,
            }
        )
    return baselines

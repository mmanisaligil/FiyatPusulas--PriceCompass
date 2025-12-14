import uuid
import pytest
from sqlalchemy import select

from app.models.models import CanonicalCategory, CanonicalProduct, ProductAlias, MatchSource, ExtractedLineItem, ResolutionStatus
from app.services.er import resolve_line_item


@pytest.mark.asyncio
async def test_alias_exact_match(session):
    category = CanonicalCategory(name_tr="Sut", weight_factor=1.0)
    product = CanonicalProduct(name_tr="Sut 1L", base_unit="ml", category=category)
    alias = ProductAlias(
        raw_text_normalized="SUT 1L",
        canonical_product_id=product.id,
        match_source=MatchSource.EXACT,
        confidence=0.95,
    )
    session.add_all([category, product, alias])
    await session.commit()

    li = ExtractedLineItem(
        receipt_id=uuid.uuid4(),
        raw_text_original="Süt 1L",
        raw_text_normalized="SUT 1L",
        detected_price=10.0,
        detected_quantity=None,
        confidence_score=0.2,
    )
    session.add(li)
    await session.flush()
    await resolve_line_item(session, li)
    assert li.resolution_status == ResolutionStatus.AUTO_RESOLVED
    assert li.canonical_product_id == product.id

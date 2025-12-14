import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.models import BarcodeMapping, CanonicalProduct, MatchSource
from app.services.er import link_manual_alias, normalize_text

router = APIRouter()


class BarcodeLinkRequest(BaseModel):
    ean13: str
    canonical_product_id: uuid.UUID
    alias_text: str | None = None


@router.post("/link")
async def link_barcode(payload: BarcodeLinkRequest, session: AsyncSession = Depends(get_session)):
    product_result = await session.execute(
        select(CanonicalProduct).where(CanonicalProduct.id == payload.canonical_product_id)
    )
    product = product_result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Canonical product not found")

    mapping = await session.get(BarcodeMapping, payload.ean13)
    if mapping:
        mapping.canonical_product_id = payload.canonical_product_id
    else:
        mapping = BarcodeMapping(ean13=payload.ean13, canonical_product_id=payload.canonical_product_id)
        session.add(mapping)

    if payload.alias_text:
        normalized = normalize_text(payload.alias_text)
        await link_manual_alias(session, normalized, payload.canonical_product_id, MatchSource.BARCODE)

    await session.commit()
    return {"ean13": payload.ean13, "canonical_product_id": str(payload.canonical_product_id)}

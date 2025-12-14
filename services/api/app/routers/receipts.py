import uuid
from datetime import date
import re

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.models import (
    Receipt,
    ExtractedLineItem,
    ImageProcessingStatus,
    ResolutionStatus,
    UserAnonymizedProfile,
    MatchSource,
)
from app.services.ocr import dummy_ocr
from app.services.er import normalize_text, resolve_line_item, link_manual_alias

router = APIRouter()


class ConfirmRequest(BaseModel):
    items: list[dict]


def parse_line_items(layout: dict) -> list[tuple[str, float | None]]:
    items: list[tuple[str, float | None]] = []
    price_pattern = re.compile(r"(\d+[.,]\d{2})")
    for line in layout.get("lines", []):
        text = line.get("text", "")
        price_match = price_pattern.search(text)
        price = float(price_match.group(1).replace(",", ".")) if price_match else None
        items.append((text, price))
    return items


async def get_or_create_user(session: AsyncSession, user_hash: str) -> UserAnonymizedProfile:
    result = await session.execute(
        select(UserAnonymizedProfile).where(UserAnonymizedProfile.user_hash_key == user_hash)
    )
    user = result.scalars().first()
    if user:
        return user
    user = UserAnonymizedProfile(user_hash_key=user_hash)
    session.add(user)
    await session.flush()
    return user


@router.post("/upload")
async def upload_receipt(
    retailer_name: str,
    transaction_date: date,
    location_city: str | None = None,
    total_amount: float | None = None,
    file: UploadFile = File(...),
    x_user_hash: str = Header(..., alias="X-User-Hash"),
    session: AsyncSession = Depends(get_session),
):
    user = await get_or_create_user(session, x_user_hash)
    layout = dummy_ocr(file)
    parsed_items = parse_line_items(layout)

    receipt = Receipt(
        user_hash_key=user.user_hash_key,
        retailer_name=retailer_name,
        location_city=location_city,
        transaction_date=transaction_date,
        total_amount=total_amount,
        image_processing_status=ImageProcessingStatus.OCR_DONE,
        ocr_raw_dump=layout,
    )
    session.add(receipt)
    await session.flush()

    unresolved = False
    returned_candidates: list[dict] = []
    for text, price in parsed_items:
        line_item = ExtractedLineItem(
            receipt_id=receipt.id,
            raw_text_original=text,
            raw_text_normalized=normalize_text(text),
            detected_price=price,
            detected_quantity=None,
            confidence_score=0.5,
        )
        session.add(line_item)
        await session.flush()
        line_item = await resolve_line_item(session, line_item)
        if line_item.resolution_status == ResolutionStatus.UNRESOLVED:
            unresolved = True
            returned_candidates.append(
                {
                    "line_item_id": str(line_item.id),
                    "raw_text": text,
                    "candidates": line_item.candidate_options,
                }
            )
    receipt.image_processing_status = (
        ImageProcessingStatus.NEEDS_CONFIRMATION if unresolved else ImageProcessingStatus.RESOLVED
    )
    await session.commit()
    return {
        "receipt_id": str(receipt.id),
        "status": receipt.image_processing_status,
        "unresolved_items": returned_candidates,
    }


@router.post("/{receipt_id}/confirm")
async def confirm_receipt(
    receipt_id: uuid.UUID,
    payload: ConfirmRequest,
    x_user_hash: str = Header(..., alias="X-User-Hash"),
    session: AsyncSession = Depends(get_session),
):
    receipt_result = await session.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = receipt_result.scalars().first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.user_hash_key != x_user_hash:
        raise HTTPException(status_code=403, detail="Forbidden")

    for item in payload.items:
        line_item_id = uuid.UUID(item.get("line_item_id"))
        canonical_product_id = uuid.UUID(item.get("canonical_product_id"))
        alias_text = item.get("alias_text")
        li_result = await session.execute(
            select(ExtractedLineItem).where(ExtractedLineItem.id == line_item_id)
        )
        line_item = li_result.scalars().first()
        if not line_item:
            continue
        line_item.canonical_product_id = canonical_product_id
        line_item.resolution_status = ResolutionStatus.USER_CONFIRMED
        normalized = normalize_text(alias_text or line_item.raw_text_original)
        await link_manual_alias(session, normalized, canonical_product_id, MatchSource.MANUAL)
    receipt.image_processing_status = ImageProcessingStatus.RESOLVED
    await session.commit()
    return {"receipt_id": str(receipt.id), "status": receipt.image_processing_status}

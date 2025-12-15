import re
import unicodedata
import uuid
from collections import Counter
from typing import Iterable

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import (
    CanonicalProduct,
    ExtractedLineItem,
    MatchSource,
    ProductAlias,
    ResolutionStatus,
)


TURKISH_CHAR_MAP = str.maketrans(
    {
        "İ": "I",
        "I": "I",
        "Ş": "S",
        "Ğ": "G",
        "Ü": "U",
        "Ö": "O",
        "Ç": "C",
        "ı": "I",
        "ş": "S",
        "ğ": "G",
        "ü": "U",
        "ö": "O",
        "ç": "C",
    }
)


def normalize_text(text: str) -> str:
    text = text.upper()
    text = text.translate(TURKISH_CHAR_MAP)
    text = unicodedata.normalize("NFD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def token_overlap_score(source_tokens: Iterable[str], target_tokens: Iterable[str]) -> float:
    source_counts = Counter(source_tokens)
    target_counts = Counter(target_tokens)
    intersection = sum((source_counts & target_counts).values())
    union = sum((source_counts | target_counts).values())
    return intersection / union if union else 0.0


async def find_exact_alias(session: AsyncSession, normalized: str) -> ProductAlias | None:
    result = await session.execute(
        select(ProductAlias).where(ProductAlias.raw_text_normalized == normalized)
    )
    return result.scalars().first()


async def resolve_line_item(
    session: AsyncSession,
    line_item: ExtractedLineItem,
) -> ExtractedLineItem:
    normalized = normalize_text(line_item.raw_text_original)
    line_item.raw_text_normalized = normalized

    alias = await find_exact_alias(session, normalized)
    if alias:
        line_item.canonical_product_id = alias.canonical_product_id
        line_item.resolution_status = ResolutionStatus.AUTO_RESOLVED
        line_item.confidence_score = max(line_item.confidence_score, float(alias.confidence))
        await session.flush()
        return line_item

    candidate = await generate_candidates(session, normalized)
    if candidate:
        product_id, score, candidates = candidate
        if score >= settings.er_confidence_threshold:
            line_item.canonical_product_id = product_id
            line_item.resolution_status = ResolutionStatus.AUTO_RESOLVED
            line_item.confidence_score = max(line_item.confidence_score, score)
            await session.merge(
                ProductAlias(
                    raw_text_normalized=normalized,
                    canonical_product_id=product_id,
                    match_source=MatchSource.FUZZY,
                    confidence=score,
                )
            )
        else:
            line_item.resolution_status = ResolutionStatus.UNRESOLVED
            line_item.candidate_options = candidates
            line_item.confidence_score = score
    else:
        line_item.resolution_status = ResolutionStatus.UNRESOLVED
        line_item.candidate_options = None
    await session.flush()
    return line_item


async def generate_candidates(
    session: AsyncSession, normalized_text: str
) -> tuple[uuid.UUID, float, list[dict]] | None:
    tokens = normalized_text.split()
    result = await session.execute(select(CanonicalProduct.id, CanonicalProduct.name_tr))
    best_score = 0.0
    best_id: uuid.UUID | None = None
    candidate_list: list[dict] = []
    for product_id, name in result.all():
        name_norm = normalize_text(name)
        score = token_overlap_score(tokens, name_norm.split())
        if score > 0:
            candidate_list.append({"product_id": str(product_id), "name": name, "score": score})
        if score > best_score:
            best_score = score
            best_id = product_id
    if best_id is None:
        return None
    candidate_list = sorted(candidate_list, key=lambda c: c["score"], reverse=True)[:4]
    return best_id, best_score, candidate_list


async def link_manual_alias(
    session: AsyncSession, normalized_text: str, canonical_product_id: uuid.UUID, source: MatchSource
) -> ProductAlias:
    existing = await find_exact_alias(session, normalized_text)
    if existing:
        existing.canonical_product_id = canonical_product_id
        existing.match_source = source
        existing.confidence = 1.0
        await session.flush()
        return existing
    alias = ProductAlias(
        raw_text_normalized=normalized_text,
        canonical_product_id=canonical_product_id,
        match_source=source,
        confidence=1.0,
    )
    session.add(alias)
    await session.flush()
    return alias

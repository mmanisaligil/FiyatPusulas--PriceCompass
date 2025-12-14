
from __future__ import annotations

import enum
import uuid
from datetime import datetime, date

from sqlalchemy import JSON, Date, DateTime, Enum, Float, ForeignKey, Numeric, String, Text, UniqueConstraint, Index, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ImageProcessingStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    OCR_DONE = "OCR_DONE"
    PARSED = "PARSED"
    NEEDS_CONFIRMATION = "NEEDS_CONFIRMATION"
    RESOLVED = "RESOLVED"


class ResolutionStatus(str, enum.Enum):
    UNRESOLVED = "UNRESOLVED"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    USER_CONFIRMED = "USER_CONFIRMED"
    BARCODE_LINKED = "BARCODE_LINKED"


class MatchSource(str, enum.Enum):
    EXACT = "EXACT"
    FUZZY = "FUZZY"
    MANUAL = "MANUAL"
    BARCODE = "BARCODE"


class BaselineSource(str, enum.Enum):
    OFFICIAL = "OFFICIAL"
    ENAG = "ENAG"
    ITO = "ITO"


class UserAnonymizedProfile(Base):
    __tablename__ = "user_anonymized_profile"

    user_hash_key: Mapped[str] = mapped_column(String, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    city_id: Mapped[str | None] = mapped_column(String, nullable=True)

    receipts: Mapped[list["Receipt"]] = relationship(back_populates="user")


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_hash_key: Mapped[str] = mapped_column(ForeignKey("user_anonymized_profile.user_hash_key"), nullable=False)
    retailer_name: Mapped[str] = mapped_column(String, nullable=False)
    location_city: Mapped[str | None] = mapped_column(String, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    image_processing_status: Mapped[ImageProcessingStatus] = mapped_column(Enum(ImageProcessingStatus), default=ImageProcessingStatus.UPLOADED, nullable=False)
    ocr_raw_dump: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[UserAnonymizedProfile] = relationship(back_populates="receipts")
    line_items: Mapped[list["ExtractedLineItem"]] = relationship(back_populates="receipt", cascade="all, delete-orphan")


class ExtractedLineItem(Base):
    __tablename__ = "extracted_line_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False)
    raw_text_original: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text_normalized: Mapped[str] = mapped_column(String, nullable=False)
    detected_price: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    detected_quantity: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    resolution_status: Mapped[ResolutionStatus] = mapped_column(Enum(ResolutionStatus), default=ResolutionStatus.UNRESOLVED, nullable=False)
    canonical_product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("canonical_products.id"), nullable=True)
    candidate_options: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    receipt: Mapped[Receipt] = relationship(back_populates="line_items")
    canonical_product: Mapped[CanonicalProduct | None] = relationship(back_populates="line_items")

    __table_args__ = (Index("ix_extracted_line_items_normalized", "raw_text_normalized"),)


class CanonicalCategory(Base):
    __tablename__ = "canonical_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("canonical_categories.id"), nullable=True)
    name_tr: Mapped[str] = mapped_column(String, nullable=False)
    weight_factor: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    parent: Mapped[CanonicalCategory | None] = relationship(remote_side=[id])
    products: Mapped[list[CanonicalProduct]] = relationship(back_populates="category")


class CanonicalProduct(Base):
    __tablename__ = "canonical_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_tr: Mapped[str] = mapped_column(String, nullable=False)
    base_unit: Mapped[str] = mapped_column(String, nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("canonical_categories.id"), nullable=False)
    attributes: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    category: Mapped[CanonicalCategory] = relationship(back_populates="products")
    aliases: Mapped[list[ProductAlias]] = relationship(back_populates="product", cascade="all, delete-orphan")
    line_items: Mapped[list[ExtractedLineItem]] = relationship(back_populates="canonical_product")
    barcode_mappings: Mapped[list[BarcodeMapping]] = relationship(back_populates="product")
    aggregates: Mapped[list[IndexDailyAggregate]] = relationship(back_populates="product")


class ProductAlias(Base):
    __tablename__ = "product_aliases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_text_normalized: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("canonical_products.id"), nullable=False)
    match_source: Mapped[MatchSource] = mapped_column(Enum(MatchSource), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped[CanonicalProduct] = relationship(back_populates="aliases")

    __table_args__ = (Index("ix_product_alias_raw_text_normalized", "raw_text_normalized"),)


class BarcodeMapping(Base):
    __tablename__ = "barcode_mappings"

    ean13: Mapped[str] = mapped_column(String, primary_key=True)
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("canonical_products.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped[CanonicalProduct] = relationship(back_populates="barcode_mappings")


class IndexDailyAggregate(Base):
    __tablename__ = "index_daily_aggregates"

    canonical_product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("canonical_products.id"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    avg_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    median_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    sample_count: Mapped[int] = mapped_column(Float, nullable=False)

    product: Mapped[CanonicalProduct] = relationship(back_populates="aggregates")


class PersonalInflationSnapshot(Base):
    __tablename__ = "personal_inflation_snapshots"

    user_hash_key: Mapped[str] = mapped_column(ForeignKey("user_anonymized_profile.user_hash_key"), primary_key=True)
    period_month: Mapped[date] = mapped_column(Date, primary_key=True)
    personal_cpi_value: Mapped[float] = mapped_column(Numeric, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class InflationBaseline(Base):
    __tablename__ = "inflation_baselines"

    source_name: Mapped[BaselineSource] = mapped_column(Enum(BaselineSource), primary_key=True)
    period_date: Mapped[date] = mapped_column(Date, primary_key=True)
    cpi_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    yoy_change: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    mom_change: Mapped[float | None] = mapped_column(Numeric, nullable=True)

    __table_args__ = (UniqueConstraint("source_name", "period_date", name="uq_baseline_source_period"),)

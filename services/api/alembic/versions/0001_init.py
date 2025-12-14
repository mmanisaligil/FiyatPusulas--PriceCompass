"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_anonymized_profile',
        sa.Column('user_hash_key', sa.String(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('city_id', sa.String(), nullable=True),
    )

    op.create_table(
        'canonical_categories',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('parent_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name_tr', sa.String(), nullable=False),
        sa.Column('weight_factor', sa.Float(), nullable=False, server_default='1.0'),
        sa.ForeignKeyConstraint(['parent_id'], ['canonical_categories.id']),
    )

    op.create_table(
        'canonical_products',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name_tr', sa.String(), nullable=False),
        sa.Column('base_unit', sa.String(), nullable=False),
        sa.Column('category_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attributes', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['canonical_categories.id']),
    )

    op.create_table(
        'product_aliases',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('raw_text_normalized', sa.String(), nullable=False, unique=True),
        sa.Column('canonical_product_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('match_source', sa.Enum('EXACT', 'FUZZY', 'MANUAL', 'BARCODE', name='matchsource'), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['canonical_product_id'], ['canonical_products.id']),
    )
    op.create_index('ix_product_alias_raw_text_normalized', 'product_aliases', ['raw_text_normalized'])

    op.create_table(
        'barcode_mappings',
        sa.Column('ean13', sa.String(), primary_key=True),
        sa.Column('canonical_product_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['canonical_product_id'], ['canonical_products.id']),
    )

    op.create_table(
        'receipts',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_hash_key', sa.String(), sa.ForeignKey('user_anonymized_profile.user_hash_key'), nullable=False),
        sa.Column('retailer_name', sa.String(), nullable=False),
        sa.Column('location_city', sa.String(), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('total_amount', sa.Numeric(), nullable=True),
        sa.Column('image_processing_status', sa.Enum('UPLOADED', 'OCR_DONE', 'PARSED', 'NEEDS_CONFIRMATION', 'RESOLVED', name='imageprocessingstatus'), nullable=False),
        sa.Column('ocr_raw_dump', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'extracted_line_items',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('receipt_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('receipts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('raw_text_original', sa.Text(), nullable=False),
        sa.Column('raw_text_normalized', sa.String(), nullable=False),
        sa.Column('detected_price', sa.Numeric(), nullable=True),
        sa.Column('detected_quantity', sa.Numeric(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('resolution_status', sa.Enum('UNRESOLVED', 'AUTO_RESOLVED', 'USER_CONFIRMED', 'BARCODE_LINKED', name='resolutionstatus'), nullable=False),
        sa.Column('canonical_product_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('canonical_products.id'), nullable=True),
        sa.Column('candidate_options', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_extracted_line_items_normalized', 'extracted_line_items', ['raw_text_normalized'])

    op.create_table(
        'index_daily_aggregates',
        sa.Column('canonical_product_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('canonical_products.id'), primary_key=True),
        sa.Column('date', sa.Date(), primary_key=True),
        sa.Column('avg_price', sa.Numeric(), nullable=False),
        sa.Column('median_price', sa.Numeric(), nullable=False),
        sa.Column('sample_count', sa.Float(), nullable=False),
    )

    op.create_table(
        'personal_inflation_snapshots',
        sa.Column('user_hash_key', sa.String(), sa.ForeignKey('user_anonymized_profile.user_hash_key'), primary_key=True),
        sa.Column('period_month', sa.Date(), primary_key=True),
        sa.Column('personal_cpi_value', sa.Numeric(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'inflation_baselines',
        sa.Column('source_name', sa.Enum('OFFICIAL', 'ENAG', 'ITO', name='baselinesource'), primary_key=True),
        sa.Column('period_date', sa.Date(), primary_key=True),
        sa.Column('cpi_value', sa.Numeric(), nullable=True),
        sa.Column('yoy_change', sa.Numeric(), nullable=True),
        sa.Column('mom_change', sa.Numeric(), nullable=True),
    )
    op.create_unique_constraint('uq_baseline_source_period', 'inflation_baselines', ['source_name', 'period_date'])


def downgrade() -> None:
    op.drop_constraint('uq_baseline_source_period', 'inflation_baselines', type_='unique')
    op.drop_table('inflation_baselines')
    op.drop_table('personal_inflation_snapshots')
    op.drop_table('index_daily_aggregates')
    op.drop_index('ix_extracted_line_items_normalized', table_name='extracted_line_items')
    op.drop_table('extracted_line_items')
    op.drop_table('receipts')
    op.drop_table('barcode_mappings')
    op.drop_index('ix_product_alias_raw_text_normalized', table_name='product_aliases')
    op.drop_table('product_aliases')
    op.drop_table('canonical_products')
    op.drop_table('canonical_categories')
    op.drop_table('user_anonymized_profile')

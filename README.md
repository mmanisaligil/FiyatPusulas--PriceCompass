# FiyatPusulası / PriceCompass

Docker-first MVP for a privacy-preserving price observatory. Users upload receipts anonymously, OCR is run, entity resolution maps noisy line items to canonical products, and inflation snapshots are produced.

## Repo layout
```
./docker-compose.yml
./.env.example
./services/api
./services/web (Next.js frontend)
  ├─ Dockerfile
  ├─ requirements.txt
  ├─ main.py (FastAPI entrypoint)
  ├─ app/
  │   ├─ core (settings)
  │   ├─ db (engine/session)
  │   ├─ models (SQLAlchemy models)
  │   ├─ routers (FastAPI endpoints)
  │   └─ services (OCR + Entity Resolution)
  ├─ alembic (migrations)
  └─ scripts (seeders)
```

## Quickstart
1. Copy env template and start stack:
   ```bash
   cp .env.example .env
   docker compose up --build
   ```
2. In another shell (container or host with deps), apply migrations:
   ```bash
   docker compose exec api alembic upgrade head
   ```
3. Seed catalog + baselines:
   ```bash
   docker compose exec api python scripts/seed_catalog.py
   docker compose exec api python scripts/seed_baselines.py
   ```

### Deploying a single container (DigitalOcean App Platform)
- The repository ships with a root `Dockerfile` exposing two build targets:
  - **api** (default): FastAPI service on port 8000.
  - **web**: Next.js frontend on port 3000.
- Example builds:
  ```bash
  # Build API image (default target)
  docker build -t fiyatpusulasi-api .

  # Build frontend image
  docker build -t fiyatpusulasi-web --target web .
  ```
- Set `NEXT_PUBLIC_API_BASE_URL` and other envs in your DigitalOcean App settings; the image CMDs already bind to `0.0.0.0`.

Frontend is served at `http://localhost:3000` and proxies directly to the API URL configured by `NEXT_PUBLIC_API_BASE_URL`.

The API listens on `http://localhost:8000`.

## API surface (MVP)
- `GET /health` — uptime probe.
- `POST /receipts/upload` — multipart upload. Headers: `X-User-Hash`. Form fields: `retailer_name`, `transaction_date` (YYYY-MM-DD), `location_city?`, `total_amount?`, `file` (image/text). Runs dummy OCR, extracts line items, entity resolution with confidence gating. Returns unresolved items + candidates when confirmation is needed.
- `POST /receipts/{id}/confirm` — body `{ "items": [{"line_item_id", "canonical_product_id", "alias_text?"}] }` with `X-User-Hash`. Marks items as user confirmed and writes aliases (audit trail).
- `POST /barcodes/link` — body `{ean13, canonical_product_id, alias_text?}` to bridge barcodes and aliases (match_source=BARCODE).
- `GET /stats/personal` — requires `X-User-Hash`; computes median-by-category basket index across resolved line items plus baseline sources.
- `GET /stats/public` — same aggregation across all users.

### Example cURL
```bash
# Upload a simple text receipt (dummy OCR)
curl -X POST http://localhost:8000/receipts/upload \
  -H 'X-User-Hash: user123' \
  -F retailer_name='Test Market' \
  -F transaction_date='2024-01-01' \
  -F total_amount='25.00' \
  -F file=@/path/to/receipt.txt

# Confirm an unresolved line item
curl -X POST http://localhost:8000/receipts/<receipt_id>/confirm \
  -H 'X-User-Hash: user123' \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"line_item_id":"<id>","canonical_product_id":"<product_id>","alias_text":"Custom"}]}'

# Link a barcode
curl -X POST http://localhost:8000/barcodes/link \
  -H 'Content-Type: application/json' \
  -d '{"ean13":"1234567890123","canonical_product_id":"<product_id>","alias_text":"Brand Name"}'

# Stats
curl -H 'X-User-Hash: user123' http://localhost:8000/stats/personal
curl http://localhost:8000/stats/public
```

## Frontend flows (Next.js)
- **Landing (/)**: CTA'lar /upload ve /key.
- **Upload (/upload)**: sürükle-bırak, stepper; yükleme sonrası /review?receipt_id=... adresine gider ve yanıtı oturumda önbellekler.
- **Review (/review)**: belirsiz satırları aday listesi, manuel ürün ID'si veya barkod girişi ile onayla; tamamlanınca seed yoksa /seed'e gider.
- **Seed (/seed)**: 12 kelimelik seed üretir, SHA-256 ile X-User-Hash türetir, isteğe bağlı cihazda saklar.
- **Key (/key)**: mevcut seedi yapıştırıp X-User-Hash'i yeniden hesaplar.
- **Me (/me)**: X-User-Hash ile kişisel endeksi ve örnek sayısını gösterir; düşük örneklem uyarısı verir.
- **Public (/public)**: toplu endeks ve kategoriler.
- **Methodology (/methodology)**: gizlilik ve ER açıklamaları.

### Seed ve X-User-Hash
- Hesap yoktur. Seed tarayıcıda üretilir; SHA-256(seed) = X-User-Hash ve tüm API çağrılarında header olarak gönderilir.
- Seed yalnızca kullanıcı isterse localStorage'da tutulur, aksi halde sadece X-User-Hash kaydedilir.
- Seed kaybolursa aynı hash üretilemez; kişisel endeks yeniden başlar.

## Entity Resolution (ER) pipeline
1. **Normalize** text (uppercase, Turkish diacritic fold, strip non-alphanumeric, collapse spaces).
2. **Alias lookup** in `product_aliases` (match_source recorded). Exact match ⇒ `AUTO_RESOLVED`.
3. **Candidate generation** via token overlap vs `canonical_products` names.
4. **Confidence gate** using `ER_CONFIDENCE_THRESHOLD` (env). Above threshold ⇒ `AUTO_RESOLVED` + fuzzy alias insert.
5. Otherwise mark `UNRESOLVED`, attach up to 4 candidates, and set receipt status to `NEEDS_CONFIRMATION`.
6. **User confirmation** writes a MANUAL alias + updates line items to `USER_CONFIRMED`.
7. **Barcode bridge** can link EAN13 to canonical products and create BARCODE aliases.

## Privacy & safety
- Receipt pixel files are never persisted. Temporary files are overwritten with zeros then unlinked after OCR.
- Only OCR layout JSON is stored in `receipts.ocr_raw_dump` for auditability.
- User identity is `X-User-Hash`; no PII fields exist in the schema.

## Database schema
Alembic migrations create all required tables: `user_anonymized_profile`, `receipts`, `extracted_line_items`, `canonical_categories`, `canonical_products`, `product_aliases`, `barcode_mappings`, `index_daily_aggregates`, `personal_inflation_snapshots`, `inflation_baselines`.

## Testing
Run inside the api container:
```bash
cd services/api
pytest
```

## Next Engineering Steps (high impact)
1. Plug real OCR (Tesseract/cloud) and layout parsers with confidence calibration.
2. Structured line-item parsing (quantity/unit/price) using probabilistic/LLM extractors with audit logs.
3. Improved ER with embedding + lexical hybrid search, versioned models, and offline evaluation harness.
4. Active learning loop: disagreement sampling, reviewer UI, and alias lifecycle management.
5. Barcode enrichment via external product registries + validation of EAN13 checksum.
6. Fraud/anomaly detection: duplicate receipts, outlier prices, adversarial text injection.
7. Privacy hardening: differential privacy on public indices, k-anonymity thresholds, and rate limiting.
8. Bias correction and weighting (regional/city mixes) for public index.
9. Background workers (Celery/Redis) for heavy OCR/ER to keep API responsive.
10. Observability: structured logging, tracing, and metrics dashboards with data-quality checks.

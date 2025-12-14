import io
import uuid
import pytest

from app.models.models import CanonicalCategory, CanonicalProduct


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_upload_flow(client, session):
    category = CanonicalCategory(name_tr="Milk", weight_factor=1.0)
    product = CanonicalProduct(name_tr="Milk 1L", base_unit="ml", category=category)
    session.add_all([category, product])
    await session.commit()

    file_content = b"Milk 1L 20.50\n"
    resp = await client.post(
        "/receipts/upload",
        files={"file": ("receipt.txt", io.BytesIO(file_content), "text/plain")},
        data={"retailer_name": "Test Market", "transaction_date": "2024-01-01", "total_amount": "20.50"},
        headers={"X-User-Hash": "user123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["receipt_id"]
    assert body["status"] in ["NEEDS_CONFIRMATION", "RESOLVED"]

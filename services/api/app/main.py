import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.db.base import Base
from app.routers import receipts, stats, barcodes, health


app = FastAPI(title="FiyatPusulasi / PriceCompass")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app.include_router(health.router)
app.include_router(receipts.router, prefix="/receipts")
app.include_router(barcodes.router, prefix="/barcodes")
app.include_router(stats.router, prefix="/stats")

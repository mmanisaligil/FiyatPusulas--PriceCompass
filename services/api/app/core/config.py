import os
from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://pricecompass:pricecompass@db:5432/pricecompass")
    er_confidence_threshold: float = float(os.getenv("ER_CONFIDENCE_THRESHOLD", 0.7))


settings = Settings()

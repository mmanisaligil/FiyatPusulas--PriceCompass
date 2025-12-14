from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)

async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False, autocommit=False)


async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session

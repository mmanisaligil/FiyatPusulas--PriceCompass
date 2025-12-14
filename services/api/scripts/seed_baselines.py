import asyncio
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.models import BaselineSource, InflationBaseline


async def main():
    async with async_session_maker() as session:  # type: AsyncSession
        await seed_baselines(session)


def month_iter(num_months: int):
    today = date.today().replace(day=1)
    for i in range(num_months):
        month = (today.month - i - 1) % 12 + 1
        year = today.year - ((today.month - i - 1) // 12)
        yield date(year, month, 1)


async def seed_baselines(session: AsyncSession):
    rows = []
    for period in month_iter(24):
        for source in BaselineSource:
            rows.append(
                InflationBaseline(
                    source_name=source,
                    period_date=period,
                    cpi_value=100 + (hash((source.value, period)) % 20),
                    yoy_change=5.0,
                    mom_change=1.0,
                )
            )
    for row in rows:
        session.merge(row)
    await session.commit()
    print(f"Seeded {len(rows)} baseline rows")


if __name__ == "__main__":
    asyncio.run(main())

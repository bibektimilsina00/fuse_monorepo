import asyncio

import asyncpg

from apps.api.app.core.config import settings
from apps.api.app.core.logger import logger


async def create_db():
    # Connect to the default 'postgres' database to create the new one
    conn = await asyncpg.connect(
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        database="postgres",
    )
    try:
        # Check if the database exists
        exists = await conn.fetchval(
            f"SELECT 1 FROM pg_database WHERE datname = '{settings.POSTGRES_DB}'"
        )
        if not exists:
            logger.info("Creating database %s", settings.POSTGRES_DB)
            await conn.execute(f"CREATE DATABASE {settings.POSTGRES_DB}")
            logger.info("Database created successfully")
        else:
            logger.info("Database %s already exists", settings.POSTGRES_DB)
    except Exception:
        logger.error("Error creating database", exc_info=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_db())

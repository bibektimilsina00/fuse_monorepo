import asyncio

import asyncpg

from apps.api.app.core.config import settings


async def create_db():
    # Connect to the default 'postgres' database to create the new one
    conn = await asyncpg.connect(
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        database="postgres"
    )
    try:
        # Check if the database exists
        exists = await conn.fetchval(
            f"SELECT 1 FROM pg_database WHERE datname = '{settings.POSTGRES_DB}'"
        )
        if not exists:
            print(f"Creating database {settings.POSTGRES_DB}...")
            await conn.execute(f"CREATE DATABASE {settings.POSTGRES_DB}")
            print("Database created successfully.")
        else:
            print(f"Database {settings.POSTGRES_DB} already exists.")
    except Exception as e:
        print(f"Error creating database: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_db())

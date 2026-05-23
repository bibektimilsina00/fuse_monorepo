from datetime import UTC, datetime

from sqlmodel import SQLModel


class SQLModelBase(SQLModel):
    """Base class for SQLModel-backed feature models."""


def utc_now() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(UTC)


def utc_now_naive() -> datetime:
    """Return the current UTC time for timezone-naive database columns."""
    return datetime.now(UTC).replace(tzinfo=None)

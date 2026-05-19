from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

_KEBAB_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')


class SkillCreate(BaseModel):
    name: str
    description: str = ""
    content: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name is required")
        if len(v) > 64:
            raise ValueError("name must be 64 chars or fewer")
        if not _KEBAB_RE.match(v):
            raise ValueError("name must be kebab-case (a-z0-9 and hyphens)")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if len(v) > 1024:
            raise ValueError("description must be 1024 chars or fewer")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content is required")
        if len(v) > 50_000:
            raise ValueError("content must be 50,000 chars or fewer")
        return v


class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    content: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("name is required")
        if len(v) > 64:
            raise ValueError("name must be 64 chars or fewer")
        if not _KEBAB_RE.match(v):
            raise ValueError("name must be kebab-case (a-z0-9 and hyphens)")
        return v


class SkillOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillMetaOut(BaseModel):
    """Lightweight metadata — no content. Used for tool selector listings."""
    id: uuid.UUID
    name: str
    description: str

    model_config = ConfigDict(from_attributes=True)

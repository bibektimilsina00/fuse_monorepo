from datetime import datetime
from typing import Any, Optional

import uuid
from pydantic import BaseModel, ConfigDict


class CredentialBase(BaseModel):
    name: str
    type: str  # e.g. slack_oauth, github_pat


class CredentialCreate(CredentialBase):
    data: dict[str, Any]  # Raw sensitive data, will be encrypted


class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    meta: Optional[dict[str, Any]] = None


class CredentialOut(CredentialBase):
    id: uuid.UUID
    meta: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OAuthUrlResponse(BaseModel):
    url: str
    state: str

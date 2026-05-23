from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field

from apps.api.app.shared.sqlmodel import SQLModelBase, utc_now_naive


class Secret(SQLModelBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    workspace_id: uuid.UUID = Field(foreign_key="workspace.id", ondelete="CASCADE", index=True)
    name: str = Field(max_length=200)
    encrypted_value: str = Field(max_length=2000)
    scope: str = Field(default="workspace", max_length=50)
    is_secret: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now_naive)
    updated_at: datetime = Field(default_factory=utc_now_naive, sa_column_kwargs={"onupdate": utc_now_naive})

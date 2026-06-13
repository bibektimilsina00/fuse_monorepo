from __future__ import annotations

from pydantic import BaseModel


class MetaResource(BaseModel):
    """A single resource attached to a Meta credential — a Page, an Instagram
    business account, a WhatsApp phone number, or a Lead Ads form."""

    id: str
    name: str
    kind: str  # 'page' | 'ig_account' | 'waba_phone' | 'lead_form'
    secondary: str | None = None  # e.g. the linked Page name, IG username, etc.


class MetaResourcesResponse(BaseModel):
    credential_id: str
    kind: str
    resources: list[MetaResource]


class MetaWebhookReceiveResponse(BaseModel):
    status: str
    triggered_count: int
    execution_ids: list[str] = []


class WATemplate(BaseModel):
    """Lightweight projection of a Meta WhatsApp message template.

    The Graph API returns a richer payload — we surface only the fields
    the inspector needs to render the template-picker dropdown and the
    variable hint count. Full payload is still accessible via the
    `raw` field for advanced UIs / debugging.
    """

    id: str
    name: str
    language: str
    status: str  # APPROVED | PENDING | REJECTED | PAUSED | DISABLED
    category: str | None = None
    body_variable_count: int = 0
    body_preview: str = ""
    raw: dict | None = None


class WATemplatesResponse(BaseModel):
    credential_id: str
    waba_id: str
    templates: list[WATemplate]

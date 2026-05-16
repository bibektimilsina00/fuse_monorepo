from typing import List, Optional
from pydantic import BaseModel

class CredentialField(BaseModel):
    id: str
    label: str
    type: str
    placeholder: str

class APIKeyProvider:
    def __init__(
        self, 
        id: str, 
        name: str, 
        description: str, 
        icon_url: str, 
        hint: str,
        fields: List[CredentialField]
    ):
        self.id = id
        self.name = name
        self.type = "api_key"
        self.description = description
        self.icon_url = icon_url
        self.hint = hint
        self.fields = fields

PROVIDERS = {
    "openai": APIKeyProvider(
        id="openai_api_key",
        name="OpenAI",
        description="Use your OpenAI API key for AI nodes",
        icon_url="https://cdn.brandfetch.io/openai.com/icon",
        hint="sk-...",
        fields=[CredentialField(id="api_key", label="API Key", type="password", placeholder="sk-...")]
    ),
    "anthropic": APIKeyProvider(
        id="anthropic_api_key",
        name="Anthropic",
        description="Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku",
        icon_url="https://cdn.brandfetch.io/anthropic.com/icon",
        hint="sk-ant-...",
        fields=[CredentialField(id="api_key", label="API Key", type="password", placeholder="sk-ant-...")]
    ),
    "google": APIKeyProvider(
        id="google_api_key",
        name="Google Gemini",
        description="Gemini 1.5 Pro, Gemini 1.5 Flash",
        icon_url="https://cdn.brandfetch.io/google.com/icon",
        hint="API Key",
        fields=[CredentialField(id="api_key", label="API Key", type="password", placeholder="API Key")]
    ),
    "groq": APIKeyProvider(
        id="groq_api_key",
        name="Groq",
        description="Llama 3, Mixtral, Gemma (Ultra-fast inference)",
        icon_url="https://cdn.brandfetch.io/groq.com/icon",
        hint="gsk-...",
        fields=[CredentialField(id="api_key", label="API Key", type="password", placeholder="gsk-...")]
    )
}

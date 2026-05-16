import importlib
import sys

import pytest


def test_security_rejects_invalid_encryption_key(monkeypatch):
    valid_key = "ZqprL7EBBN63_Nk0a_MoJyMTTrqf06xWY_3oTibUXAY="

    monkeypatch.setenv("ENCRYPTION_KEY", valid_key)
    sys.modules.pop("apps.api.app.core.config", None)
    sys.modules.pop("apps.api.app.core.security", None)
    security = importlib.import_module("apps.api.app.core.security")

    monkeypatch.setattr(security.settings, "ENCRYPTION_KEY", "invalid")
    with pytest.raises(ValueError, match="ENCRYPTION_KEY must be a valid Fernet key"):
        importlib.reload(security)

    monkeypatch.setattr(security.settings, "ENCRYPTION_KEY", valid_key)
    importlib.reload(security)

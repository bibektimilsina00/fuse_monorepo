import pytest

from apps.api.app.core.config import settings


@pytest.fixture(autouse=True)
def _force_process_sandbox(monkeypatch):
    """Keep the suite deterministic and fast: Code-node tests use the in-process
    executor regardless of whether a Docker runtime is present. The container
    executor is exercised explicitly in test_code_container.py."""
    monkeypatch.setattr(settings, "CODE_SANDBOX", "process")

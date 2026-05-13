from apps.api.app.core.celery import celery_app  # noqa: F401 — registers tasks

app = celery_app

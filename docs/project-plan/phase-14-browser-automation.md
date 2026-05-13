# Phase 14 — Browser Automation

**Status: ⬜ Not Started**

---

## Goal

Playwright browser nodes work in the Celery worker. Navigate pages, extract text, click elements, take screenshots.

## Prerequisites

- Phase 4 complete (node system solid)
- Phase 3 complete (execution pipeline working)
- Playwright installed in worker

---

## Step 1: Install Playwright in Worker

**File:** `apps/worker/pyproject.toml` — add:

```toml
[project]
dependencies = [
    "playwright>=1.44.0",
    "celery>=5.3.0",
    "httpx>=0.27.0",
]
```

Run:
```bash
cd apps/worker && uv sync
uv run playwright install chromium
```

---

## Step 2: Playwright Manager

**File:** `apps/worker/app/browser/playwright_manager.py`

```python
import asyncio
from typing import Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class PlaywrightManager:
    """Manages a single Playwright browser instance per worker process."""

    def __init__(self):
        self._playwright = None
        self._browser = None
        self._lock = asyncio.Lock()

    async def get_browser(self):
        async with self._lock:
            if self._browser is None or not self._browser.is_connected():
                await self._start()
        return self._browser

    async def _start(self):
        from playwright.async_api import async_playwright
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        logger.info("Playwright browser started")

    async def new_page(self):
        browser = await self.get_browser()
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (compatible; FuseBot/1.0)",
        )
        return await context.new_page()

    async def close(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._playwright = None
        logger.info("Playwright browser closed")


# Module-level singleton
playwright_manager = PlaywrightManager()
```

---

## Step 3: Browser Open Page Node

**File:** `apps/api/app/node_system/builtins/browser_open_page.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class BrowserOpenPageNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="browser.open_page",
            name="Open Page",
            category="browser",
            description="Open a URL in a headless browser and return page info",
            properties=[
                {"name": "url", "label": "URL", "type": "string", "required": True,
                 "placeholder": "https://example.com"},
                {"name": "wait_until", "label": "Wait Until", "type": "options",
                 "default": "domcontentloaded",
                 "options": [
                     {"label": "DOM Content Loaded", "value": "domcontentloaded"},
                     {"label": "Network Idle", "value": "networkidle"},
                     {"label": "Load", "value": "load"},
                 ]},
                {"name": "timeout", "label": "Timeout (ms)", "type": "number",
                 "default": 30000, "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            url = self.properties.get("url")
            wait_until = self.properties.get("wait_until", "domcontentloaded")
            timeout = int(self.properties.get("timeout") or 30000)

            if not url:
                return NodeResult(success=False, error="URL is required")

            from apps.worker.app.browser.playwright_manager import playwright_manager
            page = await playwright_manager.new_page()

            try:
                await page.goto(url, wait_until=wait_until, timeout=timeout)
                title = await page.title()
                current_url = page.url
                content_length = len(await page.content())

                return NodeResult(
                    success=True,
                    output_data={
                        "url": current_url,
                        "title": title,
                        "content_length": content_length,
                    },
                )
            finally:
                await page.context.close()

        except Exception as e:
            logger.error(f"BrowserOpenPageNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 4: Browser Get Text Node

**File:** `apps/api/app/node_system/builtins/browser_get_text.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class BrowserGetTextNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="browser.get_text",
            name="Get Text",
            category="browser",
            description="Extract text content from a CSS selector on a page",
            properties=[
                {"name": "url", "label": "URL", "type": "string", "required": True},
                {"name": "selector", "label": "CSS Selector", "type": "string", "required": True,
                 "placeholder": "h1, .article-body, #main-content"},
                {"name": "all_elements", "label": "Get All Matches", "type": "boolean", "default": False},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            url = self.properties.get("url")
            selector = self.properties.get("selector")
            all_elements = self.properties.get("all_elements", False)

            if not url or not selector:
                return NodeResult(success=False, error="url and selector are required")

            from apps.worker.app.browser.playwright_manager import playwright_manager
            page = await playwright_manager.new_page()

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)

                if all_elements:
                    elements = await page.query_selector_all(selector)
                    texts = [await el.inner_text() for el in elements]
                    return NodeResult(success=True, output_data={"texts": texts, "count": len(texts)})
                else:
                    element = await page.query_selector(selector)
                    if not element:
                        return NodeResult(success=False, error=f"Element not found: {selector}")
                    text = await element.inner_text()
                    return NodeResult(success=True, output_data={"text": text})
            finally:
                await page.context.close()

        except Exception as e:
            logger.error(f"BrowserGetTextNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 5: Browser Screenshot Node

**File:** `apps/api/app/node_system/builtins/browser_screenshot.py`

```python
import base64
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class BrowserScreenshotNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="browser.screenshot",
            name="Screenshot",
            category="browser",
            description="Take a screenshot of a URL and return as base64",
            properties=[
                {"name": "url", "label": "URL", "type": "string", "required": True},
                {"name": "full_page", "label": "Full Page", "type": "boolean", "default": False},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            url = self.properties.get("url")
            full_page = bool(self.properties.get("full_page", False))

            if not url:
                return NodeResult(success=False, error="URL is required")

            from apps.worker.app.browser.playwright_manager import playwright_manager
            page = await playwright_manager.new_page()

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                screenshot_bytes = await page.screenshot(full_page=full_page)
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode()

                return NodeResult(
                    success=True,
                    output_data={
                        "screenshot_base64": screenshot_b64,
                        "url": page.url,
                        "size_bytes": len(screenshot_bytes),
                    },
                )
            finally:
                await page.context.close()

        except Exception as e:
            logger.error(f"BrowserScreenshotNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 6: Browser Click Node

**File:** `apps/api/app/node_system/builtins/browser_click.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class BrowserClickNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="browser.click",
            name="Click Element",
            category="browser",
            description="Click a CSS selector on a page and return the resulting URL",
            properties=[
                {"name": "url", "label": "URL", "type": "string", "required": True},
                {"name": "selector", "label": "CSS Selector to Click", "type": "string",
                 "required": True, "placeholder": "button#submit, a.nav-link"},
                {"name": "wait_for_navigation", "label": "Wait for Navigation", "type": "boolean",
                 "default": True},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            url = self.properties.get("url")
            selector = self.properties.get("selector")
            wait_nav = bool(self.properties.get("wait_for_navigation", True))

            if not url or not selector:
                return NodeResult(success=False, error="url and selector are required")

            from apps.worker.app.browser.playwright_manager import playwright_manager
            page = await playwright_manager.new_page()

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)

                if wait_nav:
                    async with page.expect_navigation(timeout=15000):
                        await page.click(selector)
                else:
                    await page.click(selector)

                return NodeResult(
                    success=True,
                    output_data={"url_after_click": page.url, "title": await page.title()},
                )
            finally:
                await page.context.close()

        except Exception as e:
            logger.error(f"BrowserClickNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 7: Register All Browser Nodes

**File:** `apps/api/app/node_system/registry/registry.py` — add:

```python
from apps.api.app.node_system.builtins.browser_open_page import BrowserOpenPageNode
from apps.api.app.node_system.builtins.browser_get_text import BrowserGetTextNode
from apps.api.app.node_system.builtins.browser_screenshot import BrowserScreenshotNode
from apps.api.app.node_system.builtins.browser_click import BrowserClickNode

node_registry.register(BrowserOpenPageNode)
node_registry.register(BrowserGetTextNode)
node_registry.register(BrowserScreenshotNode)
node_registry.register(BrowserClickNode)
```

Add `NodeDefinition` for each to `packages/node-definitions/src/browser.ts` and register in `NODE_REGISTRY`.

---

## Checklist

- [ ] `playwright` added to `apps/worker/pyproject.toml` + `uv sync` + `playwright install chromium`
- [ ] `PlaywrightManager` creates single browser instance per worker process
- [ ] All browser nodes close `page.context` in `finally` block — no leaked contexts
- [ ] `BrowserOpenPageNode` returns `url`, `title`, `content_length`
- [ ] `BrowserGetTextNode` supports single element + `all_elements=True` for list
- [ ] `BrowserScreenshotNode` returns base64 PNG
- [ ] `BrowserClickNode` handles navigation after click
- [ ] All browser nodes handle `TimeoutError` gracefully
- [ ] All browser nodes registered in backend and frontend registries
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
# Create workflow: Open Page → Get Text
# Graph nodes:
# n1: browser.open_page, url=https://example.com
# n2: browser.get_text, url=https://example.com, selector=h1
# Edge: n1 → n2

# Run workflow
# → {"text": "Example Domain"}
```

---

## Common Mistakes

- Not closing `page.context` — Playwright leaks contexts across executions
- Running Playwright in API process — it must run in the Celery worker (browser is heavy)
- `playwright_manager` as module singleton — fine for single-process worker, breaks with multiple Celery processes. Use `--concurrency=1` for browser worker or implement process-local management.
- `networkidle` timeout too short — some SPAs never go idle. Use `domcontentloaded` + explicit `waitForSelector` instead.
- Screenshot base64 too large for DB storage — consider storing in S3/object storage for production

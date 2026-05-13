import logging

from playwright.async_api import async_playwright

logger = logging.getLogger("fuse.worker.browser")


class BrowserService:
    def __init__(self):
        self.playwright = None
        self.browser = None

    async def start(self):
        if not self.playwright:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            logger.info("Browser service started")

    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser service stopped")

    async def run_task(self, url: str, action_type: str = "screenshot"):
        if not self.browser:
            await self.start()

        context = await self.browser.new_context()
        page = await context.new_page()

        try:
            await page.goto(url)
            if action_type == "screenshot":
                return await page.screenshot()
            elif action_type == "content":
                return await page.content()
            # Add more actions as needed
        finally:
            await context.close()


browser_service = BrowserService()

from celery import Celery
import os
import json
import asyncio
from apps.worker.app.browser.service import browser_service

app = Celery('fuse_worker', broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"))

async def _execute_node_async(execution_id: str, node_id: str, node_type: str, properties: dict, input_data: dict):
    print(f"Executing node {node_id} ({node_type}) for execution {execution_id}")
    
    result = {"status": "success", "data": {}}
    
    if node_type == "action.http_request":
        import httpx
        url = properties.get("url")
        method = properties.get("method", "GET")
        async with httpx.AsyncClient() as client:
            response = await client.request(method, url)
            result["data"] = response.json()
    
    elif node_type == "browser.open_page":
        url = properties.get("url")
        content = await browser_service.run_task(url, action_type="content")
        result["data"] = {"content": content}
        
    return result

@app.task(name="execute_node")
def execute_node(execution_id: str, node_id: str, node_type: str, properties: dict, input_data: dict):
    return asyncio.run(_execute_node_async(execution_id, node_id, node_type, properties, input_data))

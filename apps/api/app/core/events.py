from enum import Enum
from typing import Any, Dict, List, Callable
import asyncio

class EventType(str, Enum):
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    NODE_STARTED = "node_started"
    NODE_COMPLETED = "node_completed"
    LOG_EMITTED = "log_emitted"

class EventBus:
    def __init__(self):
        self._subscribers: Dict[EventType, List[Callable]] = {}

    def subscribe(self, event_type: EventType, callback: Callable):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    async def emit(self, event_type: EventType, payload: Dict[str, Any]):
        if event_type in self._subscribers:
            tasks = [asyncio.create_task(callback(payload)) for callback in self._subscribers[event_type]]
            if tasks:
                await asyncio.wait(tasks)

event_bus = EventBus()

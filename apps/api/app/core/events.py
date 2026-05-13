import asyncio
from collections.abc import Callable
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    NODE_STARTED = "node_started"
    NODE_COMPLETED = "node_completed"
    LOG_EMITTED = "log_emitted"


class EventBus:
    def __init__(self):
        self._subscribers: dict[EventType, list[Callable]] = {}

    def subscribe(self, event_type: EventType, callback: Callable):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    async def emit(self, event_type: EventType, payload: dict[str, Any]):
        if event_type in self._subscribers:
            tasks = [
                asyncio.create_task(callback(payload)) for callback in self._subscribers[event_type]
            ]
            if tasks:
                await asyncio.wait(tasks)


event_bus = EventBus()

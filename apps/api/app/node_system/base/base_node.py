from abc import ABC, abstractmethod
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

TProps = TypeVar("TProps", bound=BaseModel)


class BaseNode(ABC, Generic[TProps]):
    # Default property model if none is specified
    class DefaultProps(BaseModel):
        pass

    def __init__(self, node_id: str, properties: dict[str, Any]):
        self.node_id = node_id
        # Raw properties (still useful for dynamic access)
        self.raw_properties = properties
        # Typed properties (populated during validation)
        self.props: TProps = self.validate_properties(properties)
        # Injected credential (Step 3)
        self.credential: Optional[dict[str, Any]] = None

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> NodeMetadata:
        """Static node metadata — type, name, category, properties schema."""
        pass

    @classmethod
    def get_properties_model(cls) -> type[TProps]:
        """Override this to provide a Pydantic model for property validation."""
        from typing import cast
        return cast(type[TProps], cls.DefaultProps)

    def validate_properties(self, properties: dict[str, Any]) -> TProps:
        """Validates properties against the Pydantic model."""
        model = self.get_properties_model()
        return model(**properties)

    @abstractmethod
    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        """Core execution logic for the node."""
        pass

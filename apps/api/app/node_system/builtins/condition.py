from typing import Any

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

OPERATORS = {
    "==": lambda a, b: str(a) == str(b),
    "!=": lambda a, b: str(a) != str(b),
    ">": lambda a, b: float(a) > float(b),
    "<": lambda a, b: float(a) < float(b),
    ">=": lambda a, b: float(a) >= float(b),
    "<=": lambda a, b: float(a) <= float(b),
    "contains": lambda a, b: str(b).lower() in str(a).lower(),
    "not_contains": lambda a, b: str(b).lower() not in str(a).lower(),
}


class ConditionNode(BaseNode):
    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.condition",
            name="Condition",
            category="logic",
            description="Branch workflow based on a condition",
            properties=[
                {"name": "left", "label": "Left Value", "type": "string", "required": True},
                {
                    "name": "operator",
                    "label": "Operator",
                    "type": "options",
                    "default": "==",
                    "options": [{"label": op, "value": op} for op in OPERATORS],
                },
                {"name": "right", "label": "Right Value", "type": "string", "required": True},
            ],
            inputs=1,
            outputs=2,  # output 0 = true branch, output 1 = false branch
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            left = self.properties.get("left", "")
            operator = self.properties.get("operator", "==")
            right = self.properties.get("right", "")

            if operator not in OPERATORS:
                return NodeResult(success=False, error=f"Unknown operator: {operator}")

            try:
                result = OPERATORS[operator](left, right)
            except (ValueError, TypeError) as e:
                return NodeResult(success=False, error=f"Comparison failed: {e}")

            return NodeResult(
                success=True,
                output_data={
                    "result": result,
                    "branch": "true" if result else "false",
                    **input_data,
                },
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))

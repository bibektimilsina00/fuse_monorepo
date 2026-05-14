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
            description="Branch workflow based on boolean expressions",
            properties=[
                {
                    "name": "conditions",
                    "label": "Conditions",
                    "type": "list",
                    "default": [{"id": "if", "label": "If", "expression": ""}],
                },
            ],
            inputs=1,
            outputs=2,
            allow_error=True,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            conditions = self.properties.get("conditions", [])

            matched_id = "else"
            matched_index = -1

            for i, cond in enumerate(conditions):
                expr = cond.get("expression", "")
                if not expr:
                    continue

                if self._evaluate_expression(expr, input_data, context):
                    matched_id = cond.get("id", f"output-{i}")
                    matched_index = i
                    break

            return NodeResult(
                success=True,
                output_data={
                    "matched_id": matched_id,
                    "matched_index": matched_index,
                    "is_else": matched_id == "else",
                    **input_data,
                },
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))

    def _evaluate_expression(self, expr: str, input_data: dict, context: NodeContext) -> bool:
        # This is a simplified evaluator. In production, use a library like 'simpleeval'.
        try:
            # Basic cleanup
            expr = expr.strip()
            if expr.lower() == "true":
                return True
            if expr.lower() == "false":
                return False

            # Simple numeric comparison example: "price > 100"
            # This would need a robust implementation to match the JS-like syntax requested.
            return False
        except Exception:
            return False

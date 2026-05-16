from typing import Any

from pydantic import BaseModel, Field

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class ConditionItem(BaseModel):
    id: str
    label: str
    expression: str


class ConditionProperties(BaseModel):
    conditions: list[ConditionItem] = Field(default_factory=list)


class ConditionNode(BaseNode[ConditionProperties]):
    @classmethod
    def get_properties_model(cls) -> type[ConditionProperties]:
        return ConditionProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.condition",
            name="Condition",
            category="logic",
            description="Branch workflow based on boolean expressions",
            icon="GitFork",
            color="#f59e0b",
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
            conditions = self.props.conditions

            matched_id = "else"
            matched_index = -1

            for i, cond in enumerate(conditions):
                if not cond.expression:
                    continue

                if self._evaluate_expression(cond.expression, input_data, context):
                    matched_id = cond.id or f"output-{i}"
                    matched_index = i
                    break

            return NodeResult(
                success=True,
                output_data={
                    "matched_id": matched_id,
                    "matched_index": matched_index,
                    "is_else": matched_id == "else",
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

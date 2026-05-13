from apps.api.app.execution_engine.engine.template_resolver import TemplateResolver

# Mock data
trigger_data = {
    "user": {"name": "Bibek", "profile": {"role": "Admin"}},
    "items": [{"id": 101, "name": "Item A"}, {"id": 102, "name": "Item B"}],
    "count": 42,
    "is_active": True,
}
node_outputs = {"node_1": {"status": "success", "data": {"score": 95}}}

resolver = TemplateResolver(node_outputs, trigger_data)


def test(label, template, expected):
    result = resolver._resolve_recursive(template)
    status = "✅" if result == expected else "❌"
    print(f"{status} {label}: {template} -> {result} (Expected: {expected})")


print("--- TemplateResolver Stress Test ---")
test("Nested Object", "{{trigger.output.user.profile.role}}", "Admin")
test("Array Access", "{{trigger.output.items.0.name}}", "Item A")
test(
    "Multiple Templates",
    "Hello {{trigger.output.user.name}}, your score is {{node_1.output.data.score}}",
    "Hello Bibek, your score is 95",
)
test("Type Preservation (Int)", "{{trigger.output.count}}", 42)
test("Type Preservation (Bool)", "{{trigger.output.is_active}}", True)
test("Missing Variable", "{{trigger.output.missing}}", None)  # Single template returns None
test(
    "Missing Variable in String", "Value: {{trigger.output.missing}}", "Value: "
)  # String mixed returns ""
test(
    "JSON Stringify",
    "Data: {{trigger.output.user}}",
    'Data: {"name": "Bibek", "profile": {"role": "Admin"}}',
)

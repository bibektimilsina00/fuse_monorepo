import type { NodeDefinition } from './types'

export const ConditionNode: NodeDefinition = {
  type: 'logic.condition',
  name: 'Condition',
  category: 'logic',
  description: 'Branch workflow based on a boolean expression',
  icon: 'Workflow',
  color: '#FF752F',
  properties: [
    {
      name: 'conditions',
      label: 'Conditions',
      type: 'list',
      default: [
        { id: 'if', label: 'If', expression: '' }
      ],
    },
  ],
  inputs: 1,
  outputs: 2, // 1 for If, 1 for Else
  allowError: true,
}

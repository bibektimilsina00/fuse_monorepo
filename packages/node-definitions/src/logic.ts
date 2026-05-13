import type { NodeDefinition } from './registry'

export const DelayNode: NodeDefinition = {
  type: 'action.delay',
  name: 'Delay',
  category: 'action',
  description: 'Wait for a specified number of milliseconds',
  properties: [
    { name: 'milliseconds', label: 'Delay (ms)', type: 'number', required: true, default: 1000 },
  ],
  inputs: 1,
  outputs: 1,
}

export const ConditionNode: NodeDefinition = {
  type: 'logic.condition',
  name: 'Condition',
  category: 'logic',
  description: 'Branch workflow based on a condition',
  properties: [
    { name: 'left', label: 'Left Value', type: 'string', required: true },
    {
      name: 'operator',
      label: 'Operator',
      type: 'options',
      default: '==',
      options: [
        { label: '==', value: '==' },
        { label: '!=', value: '!=' },
        { label: '>', value: '>' },
        { label: '<', value: '<' },
        { label: '>=', value: '>=' },
        { label: '<=', value: '<=' },
        { label: 'contains', value: 'contains' },
        { label: 'not_contains', value: 'not_contains' },
      ],
    },
    { name: 'right', label: 'Right Value', type: 'string', required: true },
  ],
  inputs: 1,
  outputs: 2,
}

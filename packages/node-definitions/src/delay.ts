import type { NodeDefinition } from './types'

export const DelayNode: NodeDefinition = {
  type: 'action.delay',
  name: 'Delay',
  category: 'action',
  description: 'Wait for a specified number of milliseconds',
  properties: [
    {
      name: 'milliseconds',
      label: 'Delay (ms)',
      type: 'number',
      required: true,
      default: 1000,
    },
  ],
  inputs: 1,
  outputs: 1,
}

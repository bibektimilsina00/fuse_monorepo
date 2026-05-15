import type { NodeDefinition } from './types'

export const StarterNode: NodeDefinition = {
  type: 'trigger.manual',
  name: 'Start',
  category: 'trigger',
  description: 'Initiate workflow execution',
  icon: 'Play',
  color: '#2FB3FF',
  properties: [
    {
      name: 'startWorkflow',
      label: 'Start Workflow',
      type: 'options',
      options: [
        { label: 'Run manually', value: 'manual' },
        { label: 'Chat', value: 'chat' },
      ],
      default: 'manual',
      required: true,
    },
    {
      name: 'inputs',
      label: 'Inputs',
      type: 'schema',
      description: 'Define your workflow input schema.',
      default: [],
    },
  ],
  inputs: 0,
  outputs: 1,
}

import type { NodeDefinition } from './types'

export const WebhookTriggerNode: NodeDefinition = {
  type: 'trigger.webhook',
  name: 'Webhook Trigger',
  category: 'trigger',
  description: 'Trigger workflow via HTTP POST request',
  properties: [
    {
      name: 'path',
      label: 'Webhook Path',
      type: 'string',
      default: 'webhook-id',
      required: true,
    },
  ],
  inputs: 0,
  outputs: 1,
}

export type NodePropertyType = 'string' | 'number' | 'boolean' | 'json' | 'options' | 'credential';

export interface NodeProperty {
  name: string;
  label: string;
  type: NodePropertyType;
  description?: string;
  default?: any;
  required?: boolean | { field: string; value: any | any[] };
  options?: { label: string; value: any }[];
  placeholder?: string;
  condition?: { field: string; value: any | any[]; not?: boolean; and?: any };
  dependsOn?: string[];
  mode?: 'basic' | 'advanced' | 'both';
}

export interface NodeDefinition {
  type: string;
  name: string;
  category: 'trigger' | 'action' | 'logic' | 'ai' | 'browser' | 'integration';
  description: string;
  icon?: string;
  properties: NodeProperty[];
  inputs: number;
  outputs: number;
  credentialType?: string; // e.g. 'slack_oauth'
}

export const NODE_REGISTRY: NodeDefinition[] = [
  {
    type: 'trigger.webhook',
    name: 'Webhook Trigger',
    category: 'trigger',
    description: 'Trigger workflow via HTTP POST request',
    properties: [
      { name: 'path', label: 'Webhook Path', type: 'string', default: 'webhook-id', required: true }
    ],
    inputs: 0,
    outputs: 1
  },
  {
    type: 'action.http_request',
    name: 'HTTP Request',
    category: 'integration',
    description: 'Send an HTTP request to any API',
    properties: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'method', label: 'Method', type: 'options', default: 'GET', options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' }
      ]},
      { name: 'body', label: 'Body', type: 'json' }
    ],
    inputs: 1,
    outputs: 1
  },
  {
    type: 'action.slack_send_message',
    name: 'Send Slack Message',
    category: 'integration',
    description: 'Send a message to a Slack channel',
    credentialType: 'slack_oauth',
    properties: [
      { name: 'channel', label: 'Channel ID', type: 'string', required: true },
      { name: 'text', label: 'Message Text', type: 'string', required: true }
    ],
    inputs: 1,
    outputs: 1
  },
  {
    type: 'browser.open_page',
    name: 'Open Browser Page',
    category: 'browser',
    description: 'Open a URL in a headless browser',
    properties: [
      { name: 'url', label: 'URL', type: 'string', required: true }
    ],
    inputs: 1,
    outputs: 1
  }
];

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

import { HttpRequestNode } from './http';
import { ConditionNode, DelayNode } from './logic';

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
  HttpRequestNode,
  DelayNode,
  ConditionNode,
];

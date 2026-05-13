import { ConditionNode } from './condition';
import { DelayNode } from './delay';
import { HttpRequestNode } from './http';
import { WebhookTriggerNode } from './trigger';
import type { NodeDefinition } from './types';

export * from './types';

export const NODE_REGISTRY: NodeDefinition[] = [
  WebhookTriggerNode,
  HttpRequestNode,
  DelayNode,
  ConditionNode,
];

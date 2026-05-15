import { ConditionNode } from './condition';
import { DelayNode } from './delay';
import { HttpRequestNode } from './http';
import { StarterNode } from './starter';
import { WebhookTriggerNode } from './trigger';
import type { NodeDefinition } from './types';

export * from './types';

export const NODE_REGISTRY: NodeDefinition[] = [
  StarterNode,
  WebhookTriggerNode,
  HttpRequestNode,
  DelayNode,
  ConditionNode,
];

export type NodePropertyType = 'string' | 'number' | 'boolean' | 'json' | 'options' | 'credential' | 'key-value' | 'list';

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
  visibility?: 'user-or-llm' | 'user-only' | 'hidden';
}

export interface NodeDefinition {
  type: string;
  name: string;
  category: 'trigger' | 'action' | 'logic' | 'ai' | 'browser' | 'integration';
  description: string;
  icon: string;
  color?: string;
  properties: NodeProperty[];
  inputs: number;
  outputs: number;
  allowError?: boolean;
  credentialType?: string; // e.g. 'slack_oauth'
}

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

export interface WorkflowSchema {
  id: string;
  name: string;
  description?: string;
  nodes: NodeSchema[];
  edges: EdgeSchema[];
  metadata?: Record<string, any>;
}

export interface NodeSchema {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    properties: Record<string, any>;
    credentials?: string; // ID of the credential to use
  };
}

export interface EdgeSchema {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionEvent {
  id: string;
  executionId: string;
  nodeId?: string;
  type: 'log' | 'status_change' | 'data';
  level: 'info' | 'warn' | 'error';
  message: string;
  payload?: any;
  timestamp: string;
}

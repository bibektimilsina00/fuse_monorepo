export interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  outputData?: any;
  error?: string;
  logs: string[];
}

export interface WorkflowExecutionState {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  nodeStates: Record<string, NodeExecutionState>;
  startTime: string;
  endTime?: string;
}

export interface ExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_failed' | 'workflow_completed' | 'workflow_failed' | 'log';
  executionId: string;
  nodeId?: string;
  payload: any;
  timestamp: string;
}

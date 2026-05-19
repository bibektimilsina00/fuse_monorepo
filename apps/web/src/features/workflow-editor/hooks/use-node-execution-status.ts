import { useExecutionStore, type NodeExecutionStatus } from '@/stores/execution-store'

export function useNodeExecutionStatus(nodeId: string): NodeExecutionStatus | null {
  const currentExecutionId = useExecutionStore(s => s.currentExecutionId)
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses)
  if (!currentExecutionId) return null
  return nodeStatuses[currentExecutionId]?.[nodeId] ?? null
}

import type { ExecutionLog } from '@/lib/api/contracts'

export interface LogDataNode {
  label: string
  type: string
  value: any
}

export interface DedupedLog {
  log: ExecutionLog
  /** Execution duration in ms. Null for system logs (no node_id). */
  duration: number | null
}

/**
 * Collapses multiple log entries per node into one row and computes duration.
 *
 * The runner emits at least two logs per node: an intermediate "Executing node: X"
 * (no payload) and a final "success/failed" log (with payload). We keep only the
 * last log per node_id. Duration = last_timestamp - first_timestamp for that node.
 * System logs (no node_id) are kept in order with duration: null.
 */
export function deduplicateLogs(logs: ExecutionLog[]): DedupedLog[] {
  const firstForNode = new Map<string, ExecutionLog>()
  const lastIdForNode = new Map<string, string>()

  for (const log of logs) {
    if (!log.node_id) continue
    if (!firstForNode.has(log.node_id)) firstForNode.set(log.node_id, log)
    lastIdForNode.set(log.node_id, log.id)
  }

  const shown = new Set<string>()
  const result: DedupedLog[] = []

  for (const log of logs) {
    if (!log.node_id) {
      result.push({ log, duration: null })
      continue
    }
    if (lastIdForNode.get(log.node_id) !== log.id) continue
    if (shown.has(log.node_id)) continue
    shown.add(log.node_id)

    const first = firstForNode.get(log.node_id)
    const duration = first
      ? new Date(log.timestamp).getTime() - new Date(first.timestamp).getTime()
      : null

    result.push({ log, duration })
  }

  return result
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Returns display data for a tab, driven entirely by the payload structure.
 *
 * - Input  → payload.input (the data the node received)
 * - Output → payload.output when present; falls back to error info when the
 *            log is error-level or payload has an error field.
 *
 * No external isError flag — the function reads log.level and payload itself.
 */
export function getLogDisplayData(
  log: ExecutionLog | null,
  tab: 'Input' | 'Output',
): Record<string, unknown> | null {
  if (!log) return null
  const payload = (log.payload ?? {}) as Record<string, unknown>

  if (tab === 'Input') {
    // Return properties if available, otherwise data_in
    return (payload.input as Record<string, unknown>) || (payload.data_in as Record<string, unknown>) || null
  }

  // Output: explicit output field takes priority
  const output = (payload.output as Record<string, unknown>) || {}
  
  if (log.level === 'error' || payload.error != null) {
    return { 
      error: payload.error ?? log.message,
      ...output
    }
  }

  return Object.keys(output).length > 0 ? output : (payload.input ? null : payload)
}

export function getAvailableTabs(
  log: ExecutionLog | null,
): ('Output' | 'Input')[] {
  if (!log?.payload) return ['Output']
  const payload = log.payload as Record<string, unknown>
  
  // Show Input tab if node has config (input) or received data (data_in)
  const hasInput = payload.input != null || payload.data_in != null
  return hasInput ? ['Output', 'Input'] : ['Output']
}

export function filterLogNodes(
  data: Record<string, unknown> | null,
  query: string
): LogDataNode[] {
  if (!data || typeof data !== 'object') return []
  return Object.entries(data)
    .map(([key, value]) => ({
      label: key,
      type: typeof value,
      value: value,
    }))
    .filter((node) => {
      if (!query) return true
      const q = query.toLowerCase()
      const valStr = typeof node.value === 'object' ? JSON.stringify(node.value) : String(node.value)
      return (
        node.label.toLowerCase().includes(q) ||
        valStr.toLowerCase().includes(q)
      )
    })
}

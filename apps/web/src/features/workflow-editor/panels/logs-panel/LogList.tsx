import React from 'react'
import type { Node } from 'reactflow'
import { cn } from '@/lib/utils'
import { useExecutionStore } from '@/stores/execution-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'
import type { ExecutionLog } from '@/lib/api/contracts'
import { deduplicateLogs, formatDuration } from '@/features/workflow-editor/panels/logs-panel/log-utils'

interface LogListProps {
  isCollapsed: boolean
}

function resolveNodeInfo(log: ExecutionLog, nodes: Node[], nodeDefinitions: any[]) {
  if (!log.node_id) {
    return { iconName: null, color: null, label: log.message, isSystem: true }
  }
  const node = nodes.find((n) => n.id === log.node_id)
  if (!node) {
    return { iconName: null, color: null, label: log.message, isSystem: false }
  }
  const def = nodeDefinitions.find((d) => d.type === node.type)
  return {
    iconName: def?.icon ?? null,
    color: def?.color ?? '#4b5563',
    label: node.data?.label || def?.name || log.message,
    isSystem: false,
  }
}

const LogRow = React.memo(({ log, duration, isSelected, onClick, nodes, nodeDefinitions }: {
  log: ExecutionLog
  duration: number | null
  isSelected: boolean
  onClick: () => void
  nodes: Node[]
  nodeDefinitions: any[]
}) => {
  const { iconName, color, label, isSystem } = resolveNodeInfo(log, nodes, nodeDefinitions)
  const isError = log.level === 'error'
  const durationLabel = formatDuration(duration)

  if (isSystem) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 h-[24px] transition-all',
          isSelected ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]'
        )}
      >
        <span className="text-[11px] text-[var(--text-muted)] truncate flex-1">{label}</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 h-[30px] transition-all',
        isSelected ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]',
        isError && !isSelected && 'bg-red-500/10 border border-red-500/20'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className="flex size-[18px] flex-shrink-0 items-center justify-center rounded-md"
          style={{ background: isError ? '#ef4444' : (color ?? '#4b5563') }}
        >
          {iconName
            ? React.cloneElement(getIcon(iconName) as React.ReactElement, { className: 'size-[11px] text-white' })
            : <span className="text-white text-[8px]">●</span>
          }
        </div>
        <span className={cn(
          'min-w-0 truncate text-[13px] font-medium',
          isError ? 'text-red-400' : 'text-[var(--text-primary)]'
        )}>
          {label}
        </span>
      </div>
      {durationLabel && (
        <span className="flex-shrink-0 text-[11px] text-[var(--text-muted)]">{durationLabel}</span>
      )}
    </div>
  )
})

export const LogList = React.memo(({ isCollapsed }: LogListProps) => {
  const nodes = useWorkflowStore((s) => s.nodes)
  const nodeDefinitions = useWorkflowStore((s) => s.nodeDefinitions)
  const { runs, selectedLogId, setSelectedLogId } = useExecutionStore()

  const lastRun = runs[runs.length - 1]
  const isRunning = !!lastRun && ['pending', 'running'].includes(lastRun.status)
  const showRunLabels = runs.length > 1

  return (
    <div className="flex flex-col border-r border-[var(--border-default)] h-full overflow-hidden flex-1 min-w-0">
      <div className="flex h-[30px] flex-shrink-0 items-center bg-[var(--bg)] px-4 gap-2">
        <span className="text-[12px] font-medium text-[var(--text-icon)]">Logs</span>
        {isRunning && <div className="size-2 animate-pulse rounded-full bg-green-500" />}
      </div>

      <div className={cn('flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-1.5 space-y-0.5', isCollapsed && 'hidden')}>
        {runs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-muted)] italic">
            No executions yet
          </div>
        ) : (
          runs.map((run, runIndex) => (
            <React.Fragment key={run.id}>
              {runIndex > 0 && (
                <div className="flex items-center gap-2 py-1 px-1 mt-0.5">
                  <div className="flex-1 h-px bg-[var(--border-default)]" />
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] whitespace-nowrap shrink-0">
                    Run #{runIndex + 1}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-default)]" />
                </div>
              )}
              {showRunLabels && runIndex === 0 && (
                <div className="px-1 pb-0.5">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Run #1</span>
                </div>
              )}

              {run.logs.length === 0 ? (
                <div className="py-1.5 px-2 text-[11px] text-[var(--text-muted)] italic">
                  {['pending', 'running'].includes(run.status) ? 'Executing...' : 'No logs'}
                </div>
              ) : (
                deduplicateLogs(run.logs).map(({ log, duration }) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    duration={duration}
                    isSelected={selectedLogId === log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    nodes={nodes}
                    nodeDefinitions={nodeDefinitions}
                  />
                ))
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  )
})

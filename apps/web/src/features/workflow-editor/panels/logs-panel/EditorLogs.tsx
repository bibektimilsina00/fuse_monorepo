import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useResizable } from '@/features/workflow-editor/hooks/use-resizable'
import { useCollapsiblePanel } from '@/features/workflow-editor/hooks/use-collapsible-panel'
import { useExecutionStore } from '@/stores/execution-store'
import { useUIStore } from '@/stores/ui-store'
import { LogList } from '@/features/workflow-editor/panels/logs-panel/LogList'
import { LogInspector } from '@/features/workflow-editor/panels/logs-panel/LogInspector'

const HEADER_HEIGHT = 30

export const EditorLogs: React.FC = () => {
  const { isExecutionPanelOpen } = useExecutionStore()
  const { logOpenOnRun } = useUIStore()

  const { height, handleHeightChange, expand, toggleCollapse, isCollapsed } =
    useCollapsiblePanel(260, HEADER_HEIGHT)

  const containerRef = React.useRef<HTMLElement>(null)

  useEffect(() => {
    if (isExecutionPanelOpen && isCollapsed && logOpenOnRun) {
      expand()
    }
  }, [isExecutionPanelOpen, isCollapsed, logOpenOnRun, expand])

  const heightResizer = useResizable({
    direction: 'vertical',
    minSize: HEADER_HEIGHT,
    maxSize: typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600,
    onSizeChange: handleHeightChange,
    containerRef: containerRef as React.RefObject<HTMLElement>,
  })

  return (
    <aside
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden border-t border-[var(--border-default)] bg-[var(--bg)] flex-shrink-0 transition-[height] duration-200 ease-in-out',
        isCollapsed && 'select-none'
      )}
      style={{ height }}
      aria-label="Execution logs"
    >
      {!isCollapsed && (
        <div
          {...heightResizer}
          className="absolute top-0 right-0 left-0 z-50 h-[4px] cursor-ns-resize"
          role="separator"
        />
      )}

      <div className="flex h-full w-full min-w-0 overflow-hidden">
        <LogList isCollapsed={isCollapsed} />
        <LogInspector
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />
      </div>
    </aside>
  )
}

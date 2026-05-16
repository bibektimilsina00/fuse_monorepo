import React, { useState, useRef, useMemo } from 'react'
import { useResizable } from '@/features/workflow-editor/hooks/use-resizable'
import { ToolbarItem } from '@/features/workflow-editor/components/common/EditorUI'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'
import { useWorkflow } from '@/features/workflow-editor/hooks/use-workflow'
import { useNodes } from '@/hooks/nodes/queries'

export const ToolbarTab = React.memo(() => {
  const [triggersHeight, setTriggersHeight] = useState(300)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { addNode } = useWorkflow()
  const { data: nodeRegistry = [], isLoading, error, refetch } = useNodes()

  const internalResizer = useResizable({
    direction: 'vertical',
    minSize: 100,
    maxSize: toolbarRef.current ? toolbarRef.current.getBoundingClientRect().height - 100 : undefined,
    onSizeChange: setTriggersHeight,
    containerRef: toolbarRef as React.RefObject<HTMLElement>
  })

  const { triggers, nodes } = useMemo(() => {
    const triggers = nodeRegistry.filter(n => n.category === 'trigger').map(n => ({
      id: n.type,
      label: n.name,
      type: n.type,
      icon: getIcon(n.icon),
      color: n.color || '#10b981'
    }))

    const nodes = nodeRegistry.filter(n => n.category !== 'trigger').map(n => ({
      id: n.type,
      label: n.name,
      type: n.type,
      icon: getIcon(n.icon),
      color: n.color || '#3b82f6'
    }))

    return { triggers, nodes }
  }, [nodeRegistry])

  const handleNodeClick = (type: string) => {
    // Add node at a default position (e.g., center-ish)
    // In a real app, we might want to get the center of the current view
    addNode(type, { x: 100, y: 100 })
  }

  return (
    <div ref={toolbarRef} className="flex-1 flex flex-col overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/50 backdrop-blur-[2px]">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-primary)]" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
          <p className="text-[12px] text-red-400 mb-2 font-medium">Failed to load nodes</p>
          <button 
            onClick={() => refetch()}
            className="text-[11px] px-3 py-1 bg-[var(--surface-3)] hover:bg-[var(--surface-hover)] text-white rounded-md transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Triggers Section */}
      <div 
        className="flex flex-col min-h-0 overflow-hidden"
        style={{ height: triggersHeight }}
      >
        <h3 className="px-4 py-2 mt-2 text-[12px] font-bold text-white flex-shrink-0">Triggers</h3>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-0">
          <div className="flex flex-col">
            {triggers.map((node) => (
              <ToolbarItem 
                key={node.id} 
                {...node} 
                onClick={() => handleNodeClick(node.type)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div 
        {...internalResizer}
        className="h-[6px] w-full flex-shrink-0 cursor-ns-resize group relative z-10"
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--border-default)] transition-colors" />
      </div>

      {/* Nodes Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <h3 className="px-4 py-2 text-[12px] font-bold text-white flex-shrink-0">Nodes</h3>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-0 pb-4">
          <div className="flex flex-col">
            {nodes.map((node) => (
              <ToolbarItem 
                key={node.id} 
                {...node} 
                onClick={() => handleNodeClick(node.type)}
              />
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
})

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Workflow } from 'lucide-react'
import { useResizable } from '@/features/workflow-editor/hooks/use-resizable'

interface ConnectionsPanelProps {
  connectedNodes: any[]
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ connectedNodes }) => {
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(true)
  const [panelHeight, setPanelHeight] = useState(180)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const heightResizer = useResizable({
    direction: 'vertical',
    minSize: 80,
    maxSize: 600,
    onSizeChange: setPanelHeight,
    containerRef: containerRef as React.RefObject<HTMLElement>
  })

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col border-t border-[var(--border-default)] flex-shrink-0 overflow-hidden bg-[var(--bg)] relative transition-[height] duration-200 ease-in-out",
        !isConnectionsOpen && "select-none"
      )}
      style={{ height: isConnectionsOpen ? panelHeight : 38 }}
    >
      {isConnectionsOpen && (
        <div
          {...heightResizer}
          className="absolute top-0 right-0 left-0 z-50 h-[4px] cursor-ns-resize"
          role="separator"
        />
      )}
      {/* Panel Header */}
      <div 
        onClick={() => setIsConnectionsOpen(!isConnectionsOpen)}
        className="flex items-center gap-2 h-[38px] px-4 cursor-pointer flex-shrink-0"
      >
        <ChevronDown className={cn("w-3.5 h-3.5 text-[#888] transition-transform duration-200", !isConnectionsOpen && "-rotate-90")} />
        <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Connections</h3>
      </div>
      
      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col">
        {connectedNodes.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {connectedNodes.map((node: any) => (
              <div key={node.id} className="flex items-center gap-3">
                <div className="size-6 rounded bg-[#3b82f6] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Workflow className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[13px] font-medium text-white">{node.data.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[12px] text-[#666] italic">No incoming connections</span>
          </div>
        )}
      </div>
    </div>
  )
}

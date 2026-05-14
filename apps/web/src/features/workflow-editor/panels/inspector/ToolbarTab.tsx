import React, { useState, useRef } from 'react'
import { useResizable } from '../../hooks/use-resizable'
import { ToolbarItem } from '../../components/common/EditorUI'
import { TRIGGERS, BLOCKS } from './constants'

export const ToolbarTab = React.memo(() => {
  const [triggersHeight, setTriggersHeight] = useState(300)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const internalResizer = useResizable({
    direction: 'vertical',
    minSize: 100,
    maxSize: toolbarRef.current ? toolbarRef.current.getBoundingClientRect().height - 100 : undefined,
    onSizeChange: setTriggersHeight,
    containerRef: toolbarRef as React.RefObject<HTMLElement>
  })

  return (
    <div ref={toolbarRef} className="flex-1 flex flex-col overflow-hidden">
      {/* Triggers Section */}
      <div 
        className="flex flex-col min-h-0 overflow-hidden"
        style={{ height: triggersHeight }}
      >
        <h3 className="px-4 py-2 mt-2 text-[12px] font-bold text-white flex-shrink-0">Triggers</h3>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-0">
          <div className="flex flex-col">
            {TRIGGERS.map((node) => (
              <ToolbarItem key={node.id} {...node} />
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
            {BLOCKS.map((node) => (
              <ToolbarItem key={node.id} {...node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

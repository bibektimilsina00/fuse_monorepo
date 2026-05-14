import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useResizable } from '../../hooks/use-resizable'
import { PRISM_THEME } from '../../components/common/EditorUI'
import { LogList } from './LogList'
import { LogInspector } from './LogInspector'

const MIN_OUTPUT_WIDTH = 200
const MIN_HEIGHT = 30
const MAX_HEIGHT_RATIO = 0.8
const HEADER_HEIGHT = 30

export const EditorLogs: React.FC = () => {
  const [height, setHeight] = useState(260)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [outputWidth, setOutputWidth] = useState(500)
  
  const containerRef = useRef<HTMLElement>(null)
  const lastHeightRef = useRef(260)

  // Resizing logic
  const heightResizer = useResizable({
    direction: 'vertical',
    minSize: MIN_HEIGHT,
    maxSize: typeof window !== 'undefined' ? window.innerHeight * MAX_HEIGHT_RATIO : 600,
    onSizeChange: setHeight,
    containerRef: containerRef as React.RefObject<HTMLElement>
  })

  const widthResizer = useResizable({
    direction: 'horizontal',
    minSize: MIN_OUTPUT_WIDTH,
    onSizeChange: setOutputWidth,
    containerRef: containerRef as React.RefObject<HTMLElement>,
    invert: true
  })

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setHeight(lastHeightRef.current)
      setIsCollapsed(false)
    } else {
      lastHeightRef.current = height
      setHeight(HEADER_HEIGHT)
      setIsCollapsed(true)
    }
  }, [isCollapsed, height])

  return (
    <aside
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden border-t border-[var(--border-default)] bg-[var(--bg)] flex-shrink-0 transition-[height] duration-200 ease-in-out",
        isCollapsed && "select-none"
      )}
      style={{ height }}
      aria-label="Terminal"
    >
      <style>{PRISM_THEME}</style>
      
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
          outputWidth={outputWidth}
          toggleCollapse={toggleCollapse}
          widthResizerProps={widthResizer}
        />
      </div>
    </aside>
  )
}

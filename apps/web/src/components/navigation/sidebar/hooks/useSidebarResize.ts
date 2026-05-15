import { useState, useCallback, useRef } from 'react'
import { useUIStore } from '@/stores/ui-store'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 420

/**
 * Hook to handle sidebar resizing logic.
 */
export function useSidebarResize() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const asideRef = useRef<HTMLElement>(null)

  const handleToggleSidebar = useCallback(() => {
    if (!isSidebarCollapsed) setCustomWidth(null)
    toggleSidebar()
  }, [isSidebarCollapsed, toggleSidebar])

  const onDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    if (!asideRef.current) return
    
    const left = asideRef.current.getBoundingClientRect().left
    const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX - left))
    setCustomWidth(next)
  }, [])

  const onDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return {
    asideRef,
    customWidth,
    isSidebarCollapsed,
    handleToggleSidebar,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp
  }
}

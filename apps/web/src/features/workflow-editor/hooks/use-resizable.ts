import { useCallback, useRef, useMemo } from 'react'

interface ResizableOptions {
  direction: 'horizontal' | 'vertical'
  minSize: number
  maxSize?: number
  onSizeChange: (size: number) => void
  containerRef: React.RefObject<HTMLElement>
  invert?: boolean
}

export function useResizable({
  direction,
  minSize,
  maxSize,
  onSizeChange,
  containerRef,
  invert = false
}: ResizableOptions) {
  const isResizing = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isResizing.current = true
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    let nextSize: number

    if (direction === 'vertical') {
      const offset = invert ? rect.top - e.clientY : rect.bottom - e.clientY
      nextSize = invert ? e.clientY - rect.top : offset
    } else {
      const offset = invert ? rect.right - e.clientX : e.clientX - rect.left
      nextSize = offset
    }

    if (maxSize) nextSize = Math.min(maxSize, nextSize)
    nextSize = Math.max(minSize, nextSize)

    onSizeChange(nextSize)
  }, [direction, minSize, maxSize, onSizeChange, containerRef, invert])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    isResizing.current = false
  }, [])

  return useMemo(() => ({
    onPointerDown,
    onPointerMove,
    onPointerUp
  }), [onPointerDown, onPointerMove, onPointerUp])
}

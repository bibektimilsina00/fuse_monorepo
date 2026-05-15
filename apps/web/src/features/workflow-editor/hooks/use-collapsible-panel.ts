import { useState, useCallback, useRef } from 'react'

export function useCollapsiblePanel(initialHeight: number, headerHeight: number) {
  const [height, setHeight] = useState(initialHeight)
  const lastExpandedRef = useRef(initialHeight)

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      setHeight(newHeight)
      if (newHeight > headerHeight) {
        lastExpandedRef.current = newHeight
      }
    },
    [headerHeight]
  )

  const expand = useCallback(() => {
    setHeight(lastExpandedRef.current)
  }, [])

  const toggleCollapse = useCallback(() => {
    setHeight((prev) => {
      if (prev <= headerHeight) {
        return lastExpandedRef.current
      }
      lastExpandedRef.current = prev
      return headerHeight
    })
  }, [headerHeight])

  return {
    height,
    handleHeightChange,
    expand,
    toggleCollapse,
    isCollapsed: height <= headerHeight,
  }
}

import { useState, useRef, useLayoutEffect } from 'react'

interface PositionOptions {
  preferredSide: 'right' | 'left'
  isOpen: boolean
}

/**
 * Hook to calculate dropdown positioning and handle collisions.
 * Keeps UI components free of geometric math.
 */
export function useDropdownPosition({ preferredSide, isOpen }: PositionOptions) {
  const [isPositioned, setIsPositioned] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [origin, setOrigin] = useState<'top' | 'bottom'>('top')
  const triggerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let top = triggerRect.bottom + 8
      let left = preferredSide === 'right' 
        ? triggerRect.right - menuRect.width 
        : triggerRect.left - 4
      
      let newOrigin: 'top' | 'bottom' = 'top'

      // Vertical Collision: Flip up if no space below
      if (top + menuRect.height > viewportHeight - 12) {
        top = triggerRect.top - menuRect.height - 8
        newOrigin = 'bottom'
      }

      // Horizontal Boundary Shifting
      if (left < 12) left = 12
      if (left + menuRect.width > viewportWidth - 12) {
        left = viewportWidth - menuRect.width - 12
      }

      setCoords({ top, left })
      setOrigin(newOrigin)
      setIsPositioned(true)
    } else {
      setIsPositioned(false)
    }
  }, [isOpen, preferredSide])

  return {
    triggerRef,
    menuRef,
    coords,
    origin,
    isPositioned
  }
}

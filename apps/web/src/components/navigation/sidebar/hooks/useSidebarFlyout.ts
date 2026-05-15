import { useState, useCallback } from 'react'

interface ActiveFlyout {
  title: string
  items: any[]
  top: number
}

/**
 * Hook to handle sidebar flyout state and logic.
 */
export function useSidebarFlyout(isSidebarCollapsed: boolean, isSettingsMode: boolean) {
  const [activeFlyout, setActiveFlyout] = useState<ActiveFlyout | null>(null)

  const handleItemMouseEnter = useCallback((
    title: string, 
    items: any[], 
    e: React.MouseEvent
  ) => {
    if (!isSidebarCollapsed || isSettingsMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveFlyout({ title, items, top: rect.top })
  }, [isSidebarCollapsed, isSettingsMode])

  const closeFlyout = useCallback(() => setActiveFlyout(null), [])

  const stayInFlyout = useCallback(() => {
    if (activeFlyout) setActiveFlyout({ ...activeFlyout })
  }, [activeFlyout])

  return {
    activeFlyout,
    handleItemMouseEnter,
    closeFlyout,
    stayInFlyout
  }
}

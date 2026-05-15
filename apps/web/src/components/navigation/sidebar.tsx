import React, { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Hooks
import { useSidebarResize } from '@/components/navigation/sidebar/hooks/useSidebarResize'
import { useSidebarFlyout } from '@/components/navigation/sidebar/hooks/useSidebarFlyout'

// Components
import { SidebarHeader } from '@/components/navigation/sidebar/SidebarHeader'
import { WorkspaceSelector } from '@/components/navigation/sidebar/WorkspaceSelector'
import { SidebarBottomActions } from '@/components/navigation/sidebar/SidebarBottomActions'
import { SidebarFlyout } from '@/components/navigation/sidebar/SidebarFlyout'
import { MainNavigation } from '@/components/navigation/sidebar/MainNavigation'
import { SettingsNavigation } from '@/components/navigation/sidebar/SettingsNavigation'

/**
 * Main Sidebar component.
 * Orchestrates navigation, workspace selection, and resizing logic.
 */
export const Sidebar: React.FC = () => {
  const location = useLocation()
  const isSettingsMode = location.pathname.startsWith('/settings')
  
  // Logic extracted into hooks
  const {
    asideRef,
    customWidth,
    isSidebarCollapsed,
    handleToggleSidebar,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp
  } = useSidebarResize()

  // Sync current width to CSS variable for global access (e.g. DragOverlay)
  React.useEffect(() => {
    const width = isSidebarCollapsed ? 68 : (customWidth || 260)
    document.documentElement.style.setProperty('--current-sidebar-width', `${width}px`)
  }, [isSidebarCollapsed, customWidth])

  const {
    activeFlyout,
    handleItemMouseEnter,
    closeFlyout,
    stayInFlyout
  } = useSidebarFlyout(isSidebarCollapsed, isSettingsMode)

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  return (
    <aside
      ref={asideRef}
      className={cn(
        "flex-shrink-0 relative h-full flex flex-col bg-[var(--surface-1)] pt-3 z-40",
        isSidebarCollapsed
          ? "w-[var(--sidebar-collapsed)] overflow-visible transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          : cn("overflow-visible", !customWidth && "w-[var(--sidebar-width)]")
      )}
      style={!isSidebarCollapsed && customWidth ? { width: customWidth, minWidth: customWidth } : undefined}
      onMouseLeave={closeFlyout}
    >
      <SidebarHeader isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
      
      <WorkspaceSelector isCollapsed={isSidebarCollapsed} />

      <div className={cn("flex-1 overflow-y-auto custom-scrollbar overflow-x-visible", !isSidebarCollapsed && "pl-2.5")}>
        {isSettingsMode ? (
          <SettingsNavigation isCollapsed={isSidebarCollapsed} />
        ) : (
          <MainNavigation 
            isCollapsed={isSidebarCollapsed} 
            onItemMouseEnter={handleItemMouseEnter} 
          />
        )}
      </div>

      {/* Resize handle */}
      {!isSidebarCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize select-none z-50"
          onPointerDown={onDividerPointerDown}
          onPointerMove={onDividerPointerMove}
          onPointerUp={onDividerPointerUp}
        />
      )}

      {/* Dynamic Flyout for Collapsed State */}
      {isSidebarCollapsed && activeFlyout && !isSettingsMode && (
        <SidebarFlyout 
          title={activeFlyout.title}
          items={activeFlyout.items} 
          top={activeFlyout.top} 
          onMouseEnter={stayInFlyout}
          onMouseLeave={closeFlyout}
        />
      )}

      {!isSettingsMode && (
        <SidebarBottomActions isCollapsed={isSidebarCollapsed} isActive={isActive} />
      )}
    </aside>
  )
}

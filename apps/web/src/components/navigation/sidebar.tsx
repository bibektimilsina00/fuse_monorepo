import React, { useState, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HelpCircle, 
  ChevronDown,
  PanelLeft,
  PanelLeftOpen,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'

// Refactored sub-components
import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'
import { SidebarFlyout } from '@/components/navigation/sidebar/SidebarFlyout'
import { MainNavigation } from '@/components/navigation/sidebar/MainNavigation'
import { SettingsNavigation } from '@/components/navigation/sidebar/SettingsNavigation'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 420

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [activeFlyout, setActiveFlyout] = useState<{ type: 'tasks' | 'workflows', top: number } | null>(null)
  const [customWidth, setCustomWidth] = useState<number | null>(null)
  const asideRef = useRef<HTMLElement>(null)

  const isSettingsMode = location.pathname.startsWith('/settings')
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  const handleItemMouseEnter = useCallback((type: 'tasks' | 'workflows', e: React.MouseEvent) => {
    if (!isSidebarCollapsed || isSettingsMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveFlyout({ type, top: rect.top })
  }, [isSidebarCollapsed, isSettingsMode])

  const closeFlyout = useCallback(() => setActiveFlyout(null), [])

  const handleToggleSidebar = useCallback(() => {
    if (!isSidebarCollapsed) setCustomWidth(null)
    toggleSidebar()
  }, [isSidebarCollapsed, toggleSidebar])

  function onDividerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDividerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const left = asideRef.current!.getBoundingClientRect().left
    const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX - left))
    setCustomWidth(next)
  }

  function onDividerPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <aside
      ref={asideRef}
      className={cn(
        "flex-shrink-0 relative h-full flex flex-col bg-[var(--surface-1)] pt-3 z-40",
        isSidebarCollapsed
          ? "w-[var(--sidebar-collapsed)] overflow-visible transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          : cn("overflow-hidden", !customWidth && "w-[var(--sidebar-width)]")
      )}
      style={!isSidebarCollapsed && customWidth ? { width: customWidth, minWidth: customWidth } : undefined}
      onMouseLeave={closeFlyout}
    >
      {/* Top Section / Logo */}
      <div 
        className="flex flex-shrink-0 items-center pr-2 pb-2 pl-2.5 h-[38px]"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <div className="flex h-[30px] items-center w-full relative">
          {isSidebarCollapsed ? (
            <button onClick={handleToggleSidebar} className="flex items-center justify-center w-full h-[30px] rounded-lg hover:bg-[var(--surface-hover)] group">
              {isHeaderHovered ? <PanelLeftOpen className="w-4 h-4 text-white" /> : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="h-[16px] w-auto text-[var(--brand-accent)]">
                  <path d="M10.68 9.25C10.68 11.91 9.61 14.28 7.74 15.98C5.87 17.68 3.33 18.63 0.68 18.63H0.23V0H0.68C3.33 0 5.87 0.95 7.74 2.65C9.61 4.35 10.68 6.72 10.68 9.38" fill="currentColor" />
                  <rect x="13.1" y="12.8" width="6.3" height="6.3" rx="1.5" fill="currentColor" />
                </svg>
              )}
            </button>
          ) : (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 px-[7px] h-[30px] rounded-lg hover:bg-[var(--surface-hover)]">
                <svg width="71" height="22" viewBox="0 0 71 22" fill="none" className="h-[16px] w-auto text-[var(--text-primary)]">
                  <path d="M10.68 9.25C10.68 11.91 9.61 14.28 7.74 15.98C5.87 17.68 3.33 18.63 0.68 18.63H0.23V0H0.68C3.33 0 5.87 0.95 7.74 2.65C9.61 4.35 10.68 6.72 10.68 9.38" fill="var(--brand-accent)" />
                  <rect x="13.1" y="12.8" width="6.3" height="6.3" rx="1.5" fill="var(--brand-accent)" />
                  <g fill="currentColor">
                    <text x="22" y="16.5" fontSize="18" fontWeight="600" letterSpacing="-0.02em" className="font-season">Fuse</text>
                  </g>
                </svg>
              </Link>
              <button onClick={handleToggleSidebar} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--surface-hover)]">
                <PanelLeft className="w-4 h-4 text-[var(--text-icon)]" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="flex-shrink-0 pr-2.5 pl-[9px] mb-2.5 overflow-hidden">
        <button className={cn(
          "flex h-[32px] w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] pl-[5px] pr-2 hover:bg-[var(--surface-hover)]",
          isSidebarCollapsed ? "justify-center px-0" : ""
        )}>
          <div className="w-5 h-5 bg-[var(--brand-accent)] rounded flex items-center justify-center font-semibold text-[10px] text-white flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          {!isSidebarCollapsed && (
            <>
              <span className="flex-1 truncate text-left font-medium text-[12px] text-white">
                {user?.full_name ? `${user.full_name}'s Workspace` : 'Personal Workspace'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </>
          )}
        </button>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-visible">
        {isSettingsMode ? (
          <SettingsNavigation isCollapsed={isSidebarCollapsed} />
        ) : (
          <MainNavigation 
            isCollapsed={isSidebarCollapsed} 
            onItemMouseEnter={handleItemMouseEnter} 
          />
        )}
      </div>

      {/* Resize handle — right edge, only when expanded */}
      {!isSidebarCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize select-none z-50"
          onPointerDown={onDividerPointerDown}
          onPointerMove={onDividerPointerMove}
          onPointerUp={onDividerPointerUp}
        />
      )}

      {/* Floating Flyout */}
      {isSidebarCollapsed && activeFlyout && !isSettingsMode && (
        <SidebarFlyout 
          type={activeFlyout.type} 
          top={activeFlyout.top} 
          onMouseEnter={() => setActiveFlyout(activeFlyout)}
          onMouseLeave={closeFlyout}
        />
      )}

      {/* Bottom Actions */}
      {!isSettingsMode && (
        <div className="flex flex-shrink-0 flex-col gap-0.5 px-2 pt-2.5 pb-2.5">
          <SidebarLink 
            href="/help" 
            icon={HelpCircle} 
            label="Help" 
            active={isActive('/help')} 
            isCollapsed={isSidebarCollapsed} 
          />
          <SidebarLink 
            href="/settings" 
            icon={Settings} 
            label="Settings" 
            active={isActive('/settings')} 
            isCollapsed={isSidebarCollapsed} 
          />
        </div>
      )}
    </aside>
  )
}

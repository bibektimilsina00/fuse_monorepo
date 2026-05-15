import React, { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'
import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { SETTINGS_NAV } from '@/components/navigation/sidebar/navigation-config'

interface SettingsNavigationProps {
  isCollapsed: boolean
}

/**
 * Navigation component for the settings view.
 * Provides a categorized list of settings links and a back-to-dashboard action.
 */
export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ isCollapsed }) => {
  const location = useLocation()
  
  const isActive = useCallback((path: string) => {
    return location.pathname === path || (path === '/settings/general' && location.pathname === '/settings')
  }, [location.pathname])

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Back to App Action */}
      <div className="mb-4">
        <SidebarLink 
          href="/dashboard" 
          icon={ChevronLeft} 
          label="Back to dashboard" 
          isCollapsed={isCollapsed} 
          className="text-[var(--text-muted)] hover:text-white"
        />
      </div>

      {/* Settings Sections */}
      {SETTINGS_NAV.map((section) => (
        <SidebarSection 
          key={section.id} 
          label={section.label} 
          isCollapsed={isCollapsed}
        >
          {section.items.map((item) => (
            <SidebarLink 
              key={item.id} 
              href={item.href} 
              icon={item.icon} 
              label={item.label} 
              active={isActive(item.href)} 
              isCollapsed={isCollapsed} 
            />
          ))}
        </SidebarSection>
      ))}
    </div>
  )
}

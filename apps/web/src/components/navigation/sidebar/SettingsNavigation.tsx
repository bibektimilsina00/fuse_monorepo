import React from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'
import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { SETTINGS_NAV } from '@/components/navigation/sidebar/navigation-config'

interface SettingsNavigationProps {
  isCollapsed: boolean
}

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ isCollapsed }) => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path || (path === '/settings/general' && location.pathname === '/settings')

  return (
    <div className="flex flex-col gap-0.5 px-2">
      <SidebarLink 
        href="/dashboard" 
        icon={ChevronLeft} 
        label="Back" 
        active={false} 
        isCollapsed={isCollapsed} 
        className="mb-4" 
      />
      
      {SETTINGS_NAV.map((section) => (
        <SidebarSection 
          key={section.label} 
          label={section.label} 
          isCollapsed={isCollapsed}
        >
          {section.items.map((item) => (
            <SidebarLink
              key={item.label}
              href={item.href!}
              icon={item.icon!}
              label={item.label}
              active={isActive(item.href!)}
              isCollapsed={isCollapsed}
            />
          ))}
        </SidebarSection>
      ))}
    </div>
  )
}

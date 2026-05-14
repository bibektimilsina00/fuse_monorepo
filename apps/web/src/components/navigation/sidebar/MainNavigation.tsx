import React from 'react'
import { useLocation } from 'react-router-dom'
import { Home, Search, CirclePlus } from 'lucide-react'
import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'
import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { SidebarItem } from '@/components/navigation/sidebar/SidebarItem'
import { MAIN_NAV } from '@/components/navigation/sidebar/navigation-config'
import { useUIStore } from '@/stores/ui-store'

interface MainNavigationProps {
  isCollapsed: boolean
  onItemMouseEnter: (type: 'tasks' | 'workflows', e: React.MouseEvent) => void
}

export const MainNavigation: React.FC<MainNavigationProps> = ({ 
  isCollapsed, 
  onItemMouseEnter 
}) => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <div className="flex flex-col gap-0.5 px-2 mb-4">
        <SidebarLink 
          href="/dashboard" 
          icon={Home} 
          label="Home" 
          active={isActive('/dashboard')} 
          isCollapsed={isCollapsed} 
        />
        <SidebarItem
          icon={Search}
          label="Search"
          isCollapsed={isCollapsed}
          onClick={() => useUIStore.getState().setSearchOpen(true)}
        />
      </div>

      {MAIN_NAV.map((section) => (
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

      <SidebarSection label="All tasks" hasAdd isCollapsed={isCollapsed}>
        <SidebarItem
          variant="action"
          icon={CirclePlus}
          label="New task"
          isCollapsed={isCollapsed}
          onMouseEnter={(e) => onItemMouseEnter('tasks', e)}
        />
      </SidebarSection>

      <SidebarSection label="Workflows" hasAdd isCollapsed={isCollapsed}>
        <SidebarItem
          variant="action"
          icon={<div className="w-2 h-2 rounded-sm bg-[var(--brand-secondary)] flex-shrink-0" />}
          label="default-agent"
          href="/workflows/9394eafe-d181-4a1f-a669-91c0db6211c"
          active={location.pathname === '/workflows/9394eafe-d181-4a1f-a669-91c0db6211c'}
          isCollapsed={isCollapsed}
          onMouseEnter={(e) => onItemMouseEnter('workflows', e)}
        />
      </SidebarSection>
    </>
  )
}

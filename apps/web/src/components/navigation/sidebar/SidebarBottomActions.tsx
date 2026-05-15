import React from 'react'
import { HelpCircle, Settings } from 'lucide-react'
import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'

interface SidebarBottomActionsProps {
  isCollapsed: boolean
  isActive: (path: string) => boolean
}

export const SidebarBottomActions: React.FC<SidebarBottomActionsProps> = ({ isCollapsed, isActive }) => {
  return (
    <div className="flex flex-shrink-0 flex-col gap-0.5 px-2 pt-2.5 pb-2.5">
      <SidebarLink 
        href="/help" 
        icon={HelpCircle} 
        label="Help" 
        active={isActive('/help')} 
        isCollapsed={isCollapsed} 
      />
      <SidebarLink 
        href="/settings" 
        icon={Settings} 
        label="Settings" 
        active={isActive('/settings')} 
        isCollapsed={isCollapsed} 
      />
    </div>
  )
}

import React, { useCallback } from 'react'
import { CirclePlus } from 'lucide-react'
import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { SidebarItem } from '@/components/navigation/sidebar/SidebarItem'

interface TaskSectionProps {
  isCollapsed: boolean
  onItemMouseEnter: (title: string, items: any[], e: React.MouseEvent) => void
}

/**
 * Task-specific navigation section.
 */
export const TaskSection: React.FC<TaskSectionProps> = ({ 
  isCollapsed, 
  onItemMouseEnter 
}) => {
  return (
    <SidebarSection label="All tasks" hasAdd isCollapsed={isCollapsed}>
      <SidebarItem
        variant="action"
        icon={CirclePlus}
        label="New task"
        isCollapsed={isCollapsed}
        onMouseEnter={useCallback((e) => onItemMouseEnter('New task', [
          { label: 'Analyze Repo', icon: <CirclePlus className="w-4 h-4 text-[var(--text-icon)]" />, onClick: () => undefined },
          { label: 'Run Audit', icon: <CirclePlus className="w-4 h-4 text-[var(--text-icon)]" />, onClick: () => undefined }
        ], e), [onItemMouseEnter])}
      />
    </SidebarSection>
  )
}

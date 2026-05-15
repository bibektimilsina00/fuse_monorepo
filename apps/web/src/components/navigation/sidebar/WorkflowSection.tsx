import React, { useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { FolderPlus, Import } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { DroppableFolder } from '@/components/navigation/sidebar/DroppableFolder'
import { SortableWorkflow } from '@/components/navigation/sidebar/SortableWorkflow'
import { cn } from '@/lib/utils'
import type { Workflow, Folder } from '@/lib/api/contracts'

interface WorkflowSectionProps {
  isCollapsed: boolean
  folders: Folder[]
  rootWorkflows: Workflow[]
  workflowsByFolder: Map<string, Workflow[]>
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
  onItemMouseEnter: (title: string, items: any[], e: React.MouseEvent) => void
  onCreateWorkflow: () => void
  onCreateFolder: () => void
}

/**
 * Workflow-specific navigation section with DnD capabilities.
 */
export const WorkflowSection: React.FC<WorkflowSectionProps> = ({
  isCollapsed,
  folders,
  rootWorkflows,
  workflowsByFolder,
  expandedFolders,
  toggleFolder,
  onItemMouseEnter,
  onCreateWorkflow,
  onCreateFolder
}) => {
  const location = useLocation()
  const { setNodeRef: setRootNodeRef, isOver: isOverRoot } = useDroppable({
    id: 'workflow-section-root',
    data: { isRoot: true }
  })

  const moreMenuItems = useMemo(() => [
    { label: 'Import', icon: <Import className="w-4 h-4 text-[var(--text-muted)]" />, onClick: () => console.log('Import') },
    { label: 'Create folder', icon: <FolderPlus className="w-4 h-4 text-[var(--text-muted)]" />, onClick: onCreateFolder }
  ], [onCreateFolder])

  return (
    <SidebarSection 
      label="Workflows" 
      hasAdd 
      hasMore
      moreMenuItems={moreMenuItems}
      isCollapsed={isCollapsed}
      onAddClick={onCreateWorkflow}
    >
      <div 
        ref={setRootNodeRef} 
        className={cn(
          "flex flex-col gap-0.5 min-h-[32px] rounded-lg transition-colors pb-8", 
          isOverRoot && "bg-[var(--surface-hover)]/30"
        )}
      >
        {/* Render Folders */}
        {folders.map((folder) => (
          <DroppableFolder
            key={folder.id}
            folder={folder}
            workflows={workflowsByFolder.get(folder.id) || []}
            isCollapsed={isCollapsed}
            isActive={location.pathname === `/folders/${folder.id}`}
            isExpanded={expandedFolders.has(folder.id)}
            onToggle={() => toggleFolder(folder.id)}
            onMouseEnter={onItemMouseEnter}
          />
        ))}

        {/* Render Top-level Workflows */}
        <SortableContext 
          items={rootWorkflows.map(w => `workflow-${w.id}`)} 
          strategy={verticalListSortingStrategy}
        >
          {rootWorkflows.map((workflow) => (
            <SortableWorkflow
              key={workflow.id}
              workflow={workflow}
              isCollapsed={isCollapsed}
              active={location.pathname === `/workflows/${workflow.id}`}
              onMouseEnter={onItemMouseEnter}
            />
          ))}
        </SortableContext>
      </div>
    </SidebarSection>
  )
}

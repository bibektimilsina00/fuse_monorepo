import React, { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { 
  Home, 
  Search, 
} from 'lucide-react'
import {
  DndContext,
  closestCorners,
} from '@dnd-kit/core'

import { SidebarLink } from '@/components/navigation/sidebar/SidebarLink'
import { SidebarSection } from '@/components/navigation/sidebar/SidebarSection'
import { SidebarItem } from '@/components/navigation/sidebar/SidebarItem'
import { MAIN_NAV } from '@/components/navigation/sidebar/navigation-config'
import { useWorkflows, useCreateWorkflow } from '@/features/dashboard/hooks/use-workflows'
import { useFolders, useCreateFolder } from '@/features/dashboard/hooks/use-folders'
import { useUIStore } from '@/stores/ui-store'

// Refactored sub-sections
import { TaskSection } from '@/components/navigation/sidebar/TaskSection'
import { WorkflowSection } from '@/components/navigation/sidebar/WorkflowSection'
import { WorkflowDragOverlay } from '@/components/navigation/sidebar/WorkflowDragOverlay'
import { useWorkflowDnD } from '@/components/navigation/sidebar/hooks/useWorkflowDnD'

interface MainNavigationProps {
  isCollapsed: boolean
  onItemMouseEnter: (title: string, items: any[], e: React.MouseEvent) => void
}

/**
 * Main Navigation component.
 * Orchestrates all sidebar sections and global DnD context.
 */
export const MainNavigation: React.FC<MainNavigationProps> = ({
  isCollapsed,
  onItemMouseEnter
}) => {
  const location = useLocation()
  const { data: workflows = [] } = useWorkflows()
  const { data: folders = [] } = useFolders()
  const { mutate: createWorkflow } = useCreateWorkflow()
  const { mutate: createFolder } = useCreateFolder()
  
  // Logic extracted into hooks
  const {
    sensors,
    expandedFolders,
    rootWorkflows,
    workflowsByFolder,
    activeWorkflowForOverlay,
    toggleFolder,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useWorkflowDnD({ workflows, folders })

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  const handleCreateFolder = useCallback(() => {
    const baseName = 'New Folder'
    let finalName = baseName
    let counter = 1
    const existingNames = folders.map(f => f.name)
    while (existingNames.includes(finalName)) {
      finalName = `${baseName} ${counter}`
      counter++
    }
    createFolder(finalName)
  }, [folders, createFolder])

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Top Navigation */}
      <div className="flex flex-col gap-0.5 px-2 mb-4">
        <SidebarLink href="/dashboard" icon={Home} label="Home" active={isActive('/dashboard')} isCollapsed={isCollapsed} />
        <SidebarItem
          icon={Search}
          label="Search"
          isCollapsed={isCollapsed}
          onClick={useCallback(() => useUIStore.getState().setSearchOpen(true), [])}
        />
      </div>

      {/* Primary Navigation Sections (Dashboard, Library, etc) */}
      {MAIN_NAV.map((section) => (
        <SidebarSection key={section.label} label={section.label} isCollapsed={isCollapsed}>
          {section.items.map((item) => (
            <SidebarLink key={item.label} href={item.href!} icon={item.icon!} label={item.label} active={isActive(item.href!)} isCollapsed={isCollapsed} />
          ))}
        </SidebarSection>
      ))}

      <TaskSection isCollapsed={isCollapsed} onItemMouseEnter={onItemMouseEnter} />

      <WorkflowSection 
        isCollapsed={isCollapsed}
        folders={folders}
        rootWorkflows={rootWorkflows}
        workflowsByFolder={workflowsByFolder}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        onItemMouseEnter={onItemMouseEnter}
        onCreateWorkflow={() => createWorkflow(undefined)}
        onCreateFolder={handleCreateFolder}
      />

      <WorkflowDragOverlay activeWorkflow={activeWorkflowForOverlay} />
    </DndContext>
  )
}

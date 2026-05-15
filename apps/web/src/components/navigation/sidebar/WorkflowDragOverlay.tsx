import React from 'react'
import { DragOverlay } from '@dnd-kit/core'
import { SidebarItem } from '@/components/navigation/sidebar/SidebarItem'
import { getPersistentColorForId } from '@/components/navigation/sidebar/utils/color-utils'
import type { Workflow } from '@/lib/api/contracts'

interface WorkflowDragOverlayProps {
  activeWorkflow: Workflow | null
}

/**
 * Presentational component for the workflow drag shadow/overlay.
 */
export const WorkflowDragOverlay: React.FC<WorkflowDragOverlayProps> = ({ activeWorkflow }) => {
  if (!activeWorkflow) return null

  return (
    <DragOverlay dropAnimation={null}>
      <div 
        className="opacity-90 pointer-events-none scale-[1.02] shadow-2xl ring-1 ring-white/10 rounded-lg overflow-hidden bg-[#1e1e1e]"
        style={{ width: 'calc(var(--current-sidebar-width) - 40px)' }}
      >
        <SidebarItem
          variant="action"
          icon={<div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: getPersistentColorForId(activeWorkflow.id) }} />}
          label={activeWorkflow.name}
          className="w-full bg-[var(--surface-active)]"
        />
      </div>
    </DragOverlay>
  )
}

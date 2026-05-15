import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { getPersistentColorForId } from '@/components/navigation/sidebar/utils/color-utils'
import { DropdownMenu } from '@/components/navigation/sidebar/DropdownMenu'
import { useWorkflowMenu } from '@/components/navigation/sidebar/hooks/useWorkflowMenu'
import { ColorPalette } from '@/components/navigation/sidebar/ColorPalette'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/lib/api/contracts'

interface SortableWorkflowProps {
  workflow: Workflow
  isCollapsed: boolean
  active: boolean
  onMouseEnter: (title: string, items: any[], e: React.MouseEvent) => void
}

/**
 * Sortable Workflow Item component.
 * Responsible for individual sortable item logic and rendering.
 */
export const SortableWorkflow = React.memo(({
  workflow,
  isCollapsed,
  active,
  onMouseEnter
}: SortableWorkflowProps) => {
  const navigate = useNavigate()
  // Logic extracted into custom hook
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(workflow.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const { menuItems, currentWorkflow, updateWorkflow } = useWorkflowMenu({ 
    workflowId: workflow.id
  })

  // Override rename action to trigger inline edit
  const enhancedMenuItems = menuItems.map(item => 
    item.label === 'Rename' 
      ? { ...item, onClick: () => { setIsEditing(true); setEditName(workflow.name); } }
      : item
  )

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleRename = () => {
    if (editName && editName !== workflow.name) {
      updateWorkflow({ id: workflow.id, name: editName })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditName(workflow.name)
      setIsEditing(false)
    }
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `workflow-${workflow.id}`,
    data: { workflow }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group/item relative flex items-center justify-between rounded-lg transition-all cursor-pointer h-[30px] outline-none pr-1 pl-2 gap-2",
        isDragging ? "opacity-30" : (active ? "bg-[var(--surface-active)] text-white" : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-white")
      )}
      onMouseEnter={(e) => onMouseEnter(workflow.name, menuItems, e)}
      onClick={() => !isEditing && navigate(`/workflows/${workflow.id}`)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0 transition-colors shadow-[0_0_8px_rgba(255,255,255,0.05)]"
          style={{ backgroundColor: workflow.color || getPersistentColorForId(workflow.id) }}
        />
        {!isCollapsed && (
          isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-none outline-none text-[13px] font-[450] text-white w-full p-0 m-0"
            />
          ) : (
            <span className="truncate text-[13px] font-[450] tracking-tight">
              {workflow.name}
            </span>
          )
        )}
      </div>

      {!isCollapsed && (
        <DropdownMenu 
          items={enhancedMenuItems} 
          side="left"
          submenuContent={
            <ColorPalette 
              workflowId={workflow.id}
              currentColor={currentWorkflow?.color}
              onSelect={(color) => updateWorkflow({ id: workflow.id, color })}
            />
          }
        >
          <button className="p-1 hover:bg-[var(--surface-active)] rounded text-[var(--text-icon)] hover:text-white transition-all opacity-0 group-hover/item:opacity-100">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu>
      )}
    </div>
  )
})

SortableWorkflow.displayName = 'SortableWorkflow'

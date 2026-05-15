import React, { useState, useRef, useEffect } from 'react'
import { useUpdateFolder } from '@/features/dashboard/hooks/use-folders'
import { Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableWorkflow } from '@/components/navigation/sidebar/SortableWorkflow'
import { DropdownMenu } from '@/components/navigation/sidebar/DropdownMenu'
import { useFolderMenu } from '@/components/navigation/sidebar/hooks/useFolderMenu'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/lib/api/contracts'

interface FolderHeaderProps {
  folderName: string
  isActive: boolean
  isExpanded: boolean
  isCollapsed: boolean
  isOver: boolean
  menuItems: any[]
  isEditing: boolean
  editName: string
  onEditChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
  onToggle: (e?: React.MouseEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
}

/**
 * Presentational component for the folder header row.
 */
const FolderHeader: React.FC<FolderHeaderProps> = ({
  folderName,
  isActive,
  isExpanded,
  isCollapsed,
  isOver,
  menuItems,
  isEditing,
  editName,
  onEditChange,
  onSave,
  onCancel,
  onToggle,
  onMouseEnter
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  return (
    <div 
      className={cn(
        "relative group/folder flex items-center justify-between rounded-lg transition-all cursor-pointer h-[30px] outline-none pr-1",
        isActive ? "bg-[var(--surface-active)] text-white" : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-white",
        isOver && "bg-[var(--surface-hover)]"
      )}
      onClick={onToggle}
      onMouseEnter={onMouseEnter}
    >
    <div className="flex items-center gap-1 flex-1 min-w-0 px-2">
      {!isCollapsed && (
        <div className="flex-shrink-0 text-[var(--text-icon)]">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      )}
      {isExpanded ? (
        <FolderOpen className={cn("w-3.5 h-3.5 flex-shrink-0", isCollapsed && "mx-auto", !isActive && "text-[var(--text-icon)]")} />
      ) : (
        <FolderIcon className={cn("w-3.5 h-3.5 flex-shrink-0", isCollapsed && "mx-auto", !isActive && "text-[var(--text-icon)]")} />
      )}
      {!isCollapsed && (
        isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-none outline-none text-[13px] font-medium text-white flex-1 p-0 m-0"
          />
        ) : (
          <span className="truncate text-[13px] font-medium flex-1">{folderName}</span>
        )
      )}
    </div>
      {!isCollapsed && (
        <DropdownMenu items={menuItems} side="left">
          <button className="p-1 hover:bg-[var(--surface-active)] rounded text-[var(--text-icon)] hover:text-white transition-all opacity-0 group-hover/folder:opacity-100">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu>
      )}
    </div>
  )
}

interface DroppableFolderProps {
  folder: { id: string; name: string }
  workflows: Workflow[]
  isCollapsed: boolean
  isActive: boolean
  isExpanded: boolean
  onToggle: (e?: React.MouseEvent) => void
  onMouseEnter: (title: string, items: any[], e: React.MouseEvent) => void
}

/**
 * Droppable Folder component.
 * Responsible for folder-level DnD state and nested workflow orchestration.
 */
export const DroppableFolder = React.memo(({ 
  folder, 
  workflows, 
  isCollapsed, 
  isActive, 
  isExpanded, 
  onToggle,
  onMouseEnter,
}: DroppableFolderProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const { mutate: updateFolder } = useUpdateFolder()

  // Logic extracted into custom hook
  const { menuItems } = useFolderMenu({ folderId: folder.id })

  const enhancedMenuItems = menuItems.map(item => 
    item.label === 'Rename' 
      ? { ...item, onClick: () => { setIsEditing(true); setEditName(folder.name); } }
      : item
  )
  
  const handleRename = () => {
    if (editName && editName !== folder.name) {
      updateFolder({ id: folder.id, name: editName })
    }
    setIsEditing(false)
  }
  
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { folder }
  })

  return (
    <div ref={setNodeRef} className="flex flex-col gap-0.5 group/folder-container">
      <FolderHeader 
        folderName={folder.name}
        isActive={isActive}
        isExpanded={isExpanded}
        isCollapsed={isCollapsed}
        isOver={isOver}
        menuItems={enhancedMenuItems}
        isEditing={isEditing}
        editName={editName}
        onEditChange={setEditName}
        onSave={handleRename}
        onCancel={() => { setEditName(folder.name); setIsEditing(false); }}
        onToggle={onToggle}
        onMouseEnter={(e) => onMouseEnter(folder.name, menuItems, e)}
      />

      {isExpanded && !isCollapsed && (
        <div className="flex flex-col gap-0.5 ml-3 pl-2 border-l border-white/5 mt-0.5 min-h-[32px] pb-6">
          <SortableContext 
            items={workflows.map(w => `workflow-${w.id}`)} 
            strategy={verticalListSortingStrategy}
          >
            {workflows.map(workflow => (
              <SortableWorkflow
                key={workflow.id}
                workflow={workflow}
                isCollapsed={isCollapsed}
                active={window.location.pathname === `/workflows/${workflow.id}`}
                onMouseEnter={onMouseEnter}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
})

DroppableFolder.displayName = 'DroppableFolder'

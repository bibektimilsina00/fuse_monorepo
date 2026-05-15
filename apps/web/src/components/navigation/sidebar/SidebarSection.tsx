import React from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { DropdownMenu } from '@/components/navigation/sidebar/DropdownMenu'

interface SidebarSectionProps {
  label: string
  children: React.ReactNode
  hasAdd?: boolean
  hasMore?: boolean
  moreMenuItems?: { label: string; onClick: () => void; icon?: React.ReactNode; variant?: 'danger'; disabled?: boolean }[]
  isCollapsed?: boolean
  onAddClick?: () => void
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ 
  label, 
  children, 
  hasAdd, 
  hasMore,
  moreMenuItems,
  isCollapsed,
  onAddClick
}) => {
  return (
    <div className="flex flex-col mb-4 overflow-visible relative">
      {!isCollapsed && (
        <div className="flex items-center justify-between px-4 pb-1.5 transition-opacity">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">
            {label}
          </span>
          <div className="flex items-center gap-1">
            {hasMore && moreMenuItems && (
              <DropdownMenu items={moreMenuItems} side="left">
                <button 
                  className="p-0.5 hover:bg-[var(--surface-hover)] rounded text-[var(--text-icon)] hover:text-white transition-colors"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenu>
            )}
            {hasAdd && (
              <button 
                onClick={onAddClick}
                className="p-0.5 hover:bg-[var(--surface-hover)] rounded text-[var(--text-icon)] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-0.5 px-2 overflow-visible">
        {children}
      </div>
    </div>
  )
}

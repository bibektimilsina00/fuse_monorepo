import React from 'react'
import { Plus, CirclePlus, MoreHorizontal } from 'lucide-react'

interface FlyoutItemProps {
  icon: React.ReactNode
  label: string
}

const FlyoutItem: React.FC<FlyoutItemProps> = ({ icon, label }) => (
  <button className="group/item flex items-center justify-between w-full px-2.5 py-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[13px] text-[var(--text-primary)] text-left transition-colors">
    <div className="flex items-center gap-2.5 truncate">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <MoreHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0" />
  </button>
)

interface SidebarFlyoutProps {
  type: 'tasks' | 'workflows'
  top: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export const SidebarFlyout: React.FC<SidebarFlyoutProps> = ({ 
  type, 
  top, 
  onMouseEnter, 
  onMouseLeave 
}) => {
  return (
    <div 
      className="fixed left-[var(--sidebar-collapsed)] pl-1.5 z-[9999] pointer-events-auto"
      style={{ top: top - 6 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="w-[164px] rounded-[10px] border border-[var(--border-strong)] bg-[#1c1c1c] shadow-lg overflow-hidden animate-in fade-in slide-in-from-left-0.5 duration-100">
        <div className="px-3 py-2 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Plus className="w-3 h-3 text-[var(--text-body)]" />
            <span className="text-[13px] font-medium text-white tracking-tight">
              {type === 'tasks' ? 'New task' : 'New workflow'}
            </span>
          </div>
        </div>
        <div className="p-1">
          {type === 'tasks' ? (
            <>
              <FlyoutItem icon={<CirclePlus className="w-4 h-4 text-[var(--text-icon)]" />} label="Analyze Repo" />
              <FlyoutItem icon={<CirclePlus className="w-4 h-4 text-[var(--text-icon)]" />} label="Run Audit" />
              <FlyoutItem icon={<CirclePlus className="w-4 h-4 text-[var(--text-icon)]" />} label="Security Check" />
            </>
          ) : (
            <>
              <FlyoutItem 
                icon={<div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-secondary)] flex-shrink-0" />} 
                label="default-agent" 
              />
              <FlyoutItem 
                icon={<div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)] flex-shrink-0" />} 
                label="research-bot" 
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

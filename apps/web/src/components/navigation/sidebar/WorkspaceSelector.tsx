import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface WorkspaceSelectorProps {
  isCollapsed: boolean
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ isCollapsed }) => {
  const { user } = useAuthStore()

  return (
    <div className="flex-shrink-0 pr-2.5 pl-[9px] mb-2.5 overflow-hidden">
      <button className={cn(
        "flex h-[32px] w-full items-center gap-2 rounded-lg border border-white/5 bg-[var(--surface-2)] pl-[5px] pr-2 hover:bg-[var(--surface-hover)] transition-colors group",
        isCollapsed ? "justify-center px-0" : ""
      )}>
        <div className="w-5 h-5 bg-[var(--brand-accent)] rounded flex items-center justify-center font-semibold text-[10px] text-white flex-shrink-0">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate text-left font-medium text-[12px] text-white">
              {user?.full_name ? `${user.full_name}'s Workspace` : 'Personal Workspace'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-white transition-colors" />
          </>
        )}
      </button>
    </div>
  )
}

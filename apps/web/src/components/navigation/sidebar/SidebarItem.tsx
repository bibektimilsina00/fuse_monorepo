import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SidebarItemProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  label: string
  onClick?: (e: React.MouseEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  isCollapsed?: boolean
  className?: string
  active?: boolean
  variant?: 'default' | 'action'
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: IconOrNode, 
  label, 
  onClick, 
  onMouseEnter,
  isCollapsed, 
  className,
  active,
  variant = 'default'
}) => {
  const isIconNode = React.isValidElement(IconOrNode)
  
  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "group flex h-[30px] items-center gap-2.5 rounded-lg px-2 transition-all relative cursor-pointer",
        active 
          ? "bg-[var(--surface-active)] text-white font-medium" 
          : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-white",
        isCollapsed ? "justify-center px-0" : "",
        variant === 'action' ? "gap-2" : "gap-2.5",
        className
      )}
    >
      {isIconNode ? (
        IconOrNode
      ) : (
        // @ts-expect-error - We know it's a component if it's not a node
        <IconOrNode className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors", 
          active ? "text-white" : "text-[var(--text-icon)] group-hover:text-white"
        )} />
      )}
      {!isCollapsed && (
        <span className={cn(
          "truncate font-medium",
          variant === 'action' ? "text-[14px]" : "text-[13px]"
        )}>
          {label}
        </span>
      )}
    </div>
  )
}

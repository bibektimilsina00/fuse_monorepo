import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SidebarLinkProps {
  href: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  isCollapsed?: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({ 
  href, 
  icon: Icon, 
  label, 
  active, 
  isCollapsed, 
  className,
  onClick
}) => {
  const content = (
    <>
      <Icon className={cn(
        "w-4 h-4 flex-shrink-0 transition-colors", 
        active ? "text-white" : "text-[var(--text-icon)] group-hover:text-white"
      )} />
      {!isCollapsed && <span className="truncate text-[13px] font-medium">{label}</span>}
    </>
  )

  const commonClasses = cn(
    "group flex h-[30px] items-center gap-2.5 rounded-lg px-2 transition-all relative",
    active 
      ? "bg-[var(--surface-active)] text-white font-medium" 
      : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-white",
    isCollapsed ? "justify-center px-0" : "",
    className
  )

  if (href.startsWith('http') || !href) {
     return (
      <button onClick={onClick} className={commonClasses}>
        {content}
      </button>
     )
  }

  return (
    <Link to={href} className={commonClasses} onClick={onClick}>
      {content}
    </Link>
  )
}

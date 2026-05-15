import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  icon: React.ReactNode | React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  isCollapsed?: boolean
  variant?: 'default' | 'action'
  href?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
}

/**
 * Base Sidebar Item component.
 * Handles both Link and Button modes with consistent styling and behavior.
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  active, 
  isCollapsed, 
  variant = 'default',
  href,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const isLink = !!href
  
  const commonClasses = cn(
    "group flex h-[30px] items-center rounded-lg px-2 transition-all relative cursor-pointer outline-none",
    active 
      ? "bg-[var(--surface-active)] text-white font-medium" 
      : "text-[var(--text-body)] hover:bg-[var(--surface-hover)] hover:text-white",
    isCollapsed ? "justify-center px-0" : "gap-2.5",
    variant === 'action' && !isCollapsed && "gap-2",
    className
  )

  const renderIcon = () => {
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && 'render' in Icon)) {
      const IconComponent = Icon as React.ComponentType<{ className?: string }>
      return (
        <IconComponent className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors", 
          active ? "text-white" : "text-[var(--text-icon)] group-hover:text-white"
        )} />
      )
    }
    return <div className="flex-shrink-0 transition-opacity group-hover:opacity-100">{Icon}</div>
  }

  const content = (
    <>
      {renderIcon()}
      {!isCollapsed && <span className="truncate text-[13px] font-[450] tracking-tight">{label}</span>}
    </>
  )

  if (isLink) {
    return (
      <Link 
        to={href!} 
        className={commonClasses}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {content}
      </Link>
    )
  }

  return (
    <button 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={commonClasses}
    >
      {content}
    </button>
  )
}

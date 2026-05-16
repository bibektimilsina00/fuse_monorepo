import React from 'react'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FlyoutItemProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
  variant?: 'danger'
  disabled?: boolean
}

const FlyoutItem: React.FC<FlyoutItemProps> = ({ label, onClick, icon, variant, disabled }) => {
  const renderIcon = () => {
    if (!icon) return null
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in icon)) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>
      return <IconComponent className="w-3.5 h-3.5" />
    }
    return icon
  }

  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      className={cn(
        "group/item flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-[13px] text-left transition-colors",
        variant === 'danger'
          ? "text-red-400 hover:bg-red-500/10"
          : "text-[var(--text-primary)] hover:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <div className="flex items-center gap-2.5 truncate">
        <div className="flex-shrink-0 opacity-70">{renderIcon()}</div>
        <span className="truncate font-[420]">{label}</span>
      </div>
      {!disabled && <MoreHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0" />}
    </button>
  )
}

interface SidebarFlyoutProps {
  title: string
  items: FlyoutItemProps[]
  top: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export const SidebarFlyout: React.FC<SidebarFlyoutProps> = ({
  title,
  items,
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
      <div className="w-[180px] rounded-[10px] border border-white/5 bg-surface-modal shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150">
        <div className="px-3 py-2 border-b border-white/5">
          <span className="text-[12px] font-semibold text-white tracking-tight truncate block">
            {title}
          </span>
        </div>
        <div className="p-1 flex flex-col gap-0.5">
          {items.map((item, i) => (
            <FlyoutItem key={i} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils'

interface SettingsItemProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  action,
  className 
}) => {
  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--surface-hover)] transition-all group",
      className
    )}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-3)] flex items-center justify-center border border-[var(--border-default)] overflow-hidden">
             {icon}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-[var(--text-primary)]">{title}</span>
          {subtitle && (
            <span className="text-[12px] text-[var(--text-muted)]">{subtitle}</span>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

export const SettingsSection: React.FC<{ label: string, children: React.ReactNode, className?: string }> = ({ 
  label, 
  children, 
  className 
}) => (
  <div className={cn("space-y-4", className)}>
    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
      {label}
    </span>
    <div className="flex flex-col gap-1">
      {children}
    </div>
  </div>
)

import React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsRowProps {
  label: string
  description?: string
  control: React.ReactNode
  hasInfo?: boolean
  className?: string
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ 
  label, 
  description, 
  control, 
  hasInfo,
  className 
}) => (
  <div className={cn("flex items-center justify-between py-2.5", className)}>
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-[var(--text-primary)]">{label}</span>
        {hasInfo && (
          <Info className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-50 cursor-help hover:opacity-100 transition-opacity" />
        )}
      </div>
      {description && (
        <span className="text-[12px] text-[var(--text-muted)] max-w-[400px]">
          {description}
        </span>
      )}
    </div>
    {control}
  </div>
)

interface SettingsToggleProps {
  active: boolean
  onChange?: (active: boolean) => void
  disabled?: boolean
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({ 
  active, 
  onChange,
  disabled 
}) => (
  <button 
    onClick={() => !disabled && onChange?.(!active)}
    disabled={disabled}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out",
      active ? "bg-white" : "bg-[var(--surface-5)]",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <span className={cn(
      "pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out",
      active ? "translate-x-[18px] bg-black" : "translate-x-[2px] bg-[var(--text-muted)]"
    )} />
  </button>
)

export const SettingsDivider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("h-px bg-[var(--border-default)] my-4 opacity-50", className)} />
)

import React from 'react'
import { cn } from '@/lib/utils'
import { Tooltip } from './tooltip'

const sizeClasses = {
  xs: 'size-[22px] rounded-md [&_svg]:size-[11px]',
  sm: 'size-[28px] rounded-md [&_svg]:size-[13px]',
  md: 'size-[32px] rounded-lg [&_svg]:size-[15px]',
  lg: 'size-[38px] rounded-lg [&_svg]:size-[18px]',
}

const variantClasses = {
  default: 'bg-transparent text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]',
  surface: 'bg-[var(--surface-3)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]',
  danger:  'bg-transparent text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10',
  accent:  'bg-transparent text-[var(--text-muted)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/10',
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  tooltip?: string
  size?: keyof typeof sizeClasses
  variant?: keyof typeof variantClasses
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  tooltip,
  size = 'sm',
  variant = 'default',
  tooltipSide = 'top',
  className,
  ...props
}, ref) => {
  const btn = (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0 transition-all duration-150',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )

  if (!tooltip) return btn

  return (
    <Tooltip content={tooltip} side={tooltipSide}>
      {btn}
    </Tooltip>
  )
})

IconButton.displayName = 'IconButton'

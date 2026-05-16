import React from 'react'
import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'size-3 border-[1.5px]',
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-2',
}

const colorClasses = {
  current: 'border-current/20 border-t-current',
  white:   'border-white/20 border-t-white',
  accent:  'border-[var(--brand-accent)]/20 border-t-[var(--brand-accent)]',
  muted:   'border-[var(--text-muted)]/30 border-t-[var(--text-muted)]',
}

interface SpinnerProps {
  size?: keyof typeof sizeClasses
  color?: keyof typeof colorClasses
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'accent', className }) => (
  <div
    className={cn(
      'animate-spin rounded-full flex-shrink-0',
      sizeClasses[size],
      colorClasses[color],
      className,
    )}
  />
)

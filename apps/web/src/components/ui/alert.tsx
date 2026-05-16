import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeConfig = {
  error:   { icon: AlertCircle,   classes: 'bg-red-500/10 border-red-500/20 text-red-400' },
  warning: { icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  success: { icon: CheckCircle2,  classes: 'bg-[var(--brand-accent)]/10 border-[var(--brand-accent)]/20 text-[var(--brand-accent)]' },
  info:    { icon: Info,          classes: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
}

interface AlertProps {
  type?: keyof typeof typeConfig
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export const Alert: React.FC<AlertProps> = ({ type = 'error', children, onDismiss, className }) => {
  const { icon: Icon, classes } = typeConfig[type]

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 border rounded-lg px-3 py-2',
        'text-[12px] font-medium leading-snug',
        'animate-in fade-in slide-in-from-top-1 duration-200',
        classes,
        className,
      )}
    >
      <Icon className="size-3.5 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

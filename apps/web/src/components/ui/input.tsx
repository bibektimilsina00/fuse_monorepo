import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  icon?: React.ReactNode
  error?: string
  trailing?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  icon,
  error,
  trailing,
  type,
  className,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-bold text-[var(--text-primary)] ml-1"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-icon)] group-focus-within:text-[var(--brand-accent)] transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'w-full bg-[var(--surface-4)] border border-[var(--border-default)] rounded-lg',
            'py-2.5 text-[14px] text-[var(--text-primary)]',
            'placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm',
            'focus:border-[var(--brand-accent)]/50',
            error && 'border-red-500/50 focus:border-red-500/70',
            icon ? 'pl-10' : 'pl-4',
            (isPassword || trailing) ? 'pr-10' : 'pr-4',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-icon)] hover:text-[var(--text-primary)] transition-colors p-1"
          >
            {showPassword ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
          </button>
        )}
        {!isPassword && trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-red-500 ml-1">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

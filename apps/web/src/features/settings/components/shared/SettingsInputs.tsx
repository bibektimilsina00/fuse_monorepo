import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export const SettingsSearchInput: React.FC<SettingsSearchInputProps> = ({ 
  containerClassName, 
  className,
  ...props 
}) => {
  return (
    <div className={cn("relative flex-1 group", containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-white transition-colors" />
      <input 
        type="text" 
        className={cn(
          "w-full h-[32px] pl-9 pr-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] text-[13px] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent)] transition-all",
          className
        )}
        {...props}
      />
    </div>
  )
}

interface SettingsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  variant = 'secondary', 
  size = 'md',
  className, 
  children, 
  ...props 
}) => {
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-[var(--surface-3)] text-white border border-[var(--border-default)] hover:bg-[var(--surface-hover)]",
    ghost: "bg-transparent text-[var(--text-muted)] hover:text-white",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
  }

  const sizes = {
    sm: "h-[28px] px-2.5 text-[12px]",
    md: "h-[32px] px-4 text-[13px]"
  }

  return (
    <button 
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

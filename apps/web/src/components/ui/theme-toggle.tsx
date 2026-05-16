import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { ThemeMode } from '@/stores/ui-store'

const OPTIONS: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { value: 'light',  icon: <Sun  className="size-3.5" />, label: 'Light'  },
  { value: 'system', icon: <Monitor className="size-3.5" />, label: 'System' },
  { value: 'dark',   icon: <Moon className="size-3.5" />, label: 'Dark'   },
]

interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme } = useTheme()

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-3)] p-0.5 gap-0.5',
      className,
    )}>
      {OPTIONS.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 h-[26px] text-[12px] font-medium transition-all',
            theme === value
              ? 'bg-[var(--surface-2)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils'

interface BooleanInputProps {
  value: boolean
  onChange: (val: boolean) => void
}

export const BooleanInput: React.FC<BooleanInputProps> = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} className="flex items-center gap-3 cursor-pointer group">
    <div className={cn(
      "size-5 rounded border border-border flex items-center justify-center transition-all",
      value ? "bg-[var(--brand-accent)] border-[var(--brand-accent)]" : "bg-surface-editor",
    )}>
      {value && <div className="size-2 bg-white rounded-full" />}
    </div>
    <span className="text-[13px] text-white group-hover:text-[var(--brand-accent)] transition-colors">Enabled</span>
  </div>
)

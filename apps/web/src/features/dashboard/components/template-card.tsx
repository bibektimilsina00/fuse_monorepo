import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface TemplateCardProps {
  title: string
  icon: LucideIcon
  description?: string
  isSmall?: boolean
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ 
  title, 
  icon: Icon, 
  description,
  isSmall = false
}) => {
  if (isSmall) {
    return (
      <button className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3 hover:bg-[var(--surface-hover)] transition-all text-left shadow-card group">
         <Icon className="w-3.5 h-3.5 text-[var(--text-icon)] group-hover:text-[var(--brand-secondary)]" />
         <span className="text-[var(--text-primary)] text-[13px] font-medium">{title}</span>
      </button>
    )
  }

  return (
    <button className="group flex flex-col text-left overflow-hidden rounded-[12px] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all bg-[var(--surface-2)] shadow-card">
      <div className="relative h-[120px] w-full bg-[var(--surface-1)] flex items-center justify-center border-b border-[var(--border-default)]">
         <Icon className="w-8 h-8 text-[var(--text-muted)] opacity-30 group-hover:scale-110 transition-transform group-hover:text-[var(--brand-secondary)] group-hover:opacity-60" />
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3 bg-[var(--surface-3)]">
         <div className="flex items-center gap-3">
            <div className="p-1 rounded-md bg-[var(--surface-4)] border border-[var(--border-default)]">
               <Icon className="w-3.5 h-3.5 text-[var(--text-icon)] group-hover:text-[var(--brand-secondary)]" />
            </div>
            <span className="text-[var(--text-primary)] text-[13px] font-medium tracking-tight">{title}</span>
         </div>
         {description && (
           <p className="mt-1 line-clamp-1 text-[12px] text-[var(--text-muted)] font-[380]">
             {description}
           </p>
         )}
      </div>
    </button>
  )
}

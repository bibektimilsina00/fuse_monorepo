import React from 'react'
import { cn } from '@/lib/utils'

interface SettingsPageContainerProps {
  children: React.ReactNode
  maxWidth?: string
  className?: string
}

export const SettingsPageContainer: React.FC<SettingsPageContainerProps> = ({ 
  children, 
  maxWidth = "max-w-[1000px]",
  className 
}) => {
  return (
    <div className={cn(maxWidth, "mx-auto pt-10 pb-20 px-8", className)}>
      {children}
    </div>
  )
}

interface SettingsPageHeaderProps {
  title: string
  description?: string
  className?: string
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({ 
  title, 
  description,
  className 
}) => {
  return (
    <div className={cn("mb-8", className)}>
      <h1 className="text-[28px] font-semibold text-white tracking-tight">{title}</h1>
      {description && (
        <p className="text-[14px] text-[var(--text-muted)] mt-2 max-w-[600px]">
          {description}
        </p>
      )}
    </div>
  )
}

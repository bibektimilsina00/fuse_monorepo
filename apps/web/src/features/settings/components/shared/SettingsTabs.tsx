import React from 'react'
import { cn } from '@/lib/utils'

interface SettingsTab {
  id: string
  label: string
}

interface SettingsTabsProps {
  tabs: SettingsTab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-1 border-b border-[var(--border-default)] mb-8", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2 text-[13px] font-medium transition-all relative",
            activeTab === tab.id
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      ))}
    </div>
  )
}

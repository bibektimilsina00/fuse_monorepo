import React from 'react'
import { cn } from '@/lib/utils'
import { useUIStore, type InspectorTabType } from '@/stores/ui-store'

const TABS: InspectorTabType[] = ['Copilot', 'Toolbar', 'Editor']

export const TabSelector: React.FC = () => {
  const { inspectorTab: activeTab, setInspectorTab: setActiveTab } = useUIStore()

  return (
    <div className="flex items-center gap-1 px-3 py-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={cn(
            "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
            activeTab === tab ? "bg-surface-active text-white" : "text-text-muted hover:text-white hover:bg-surface-editor",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

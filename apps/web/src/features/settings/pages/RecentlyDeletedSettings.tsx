import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsItem } from '@/features/settings/components/shared/SettingsList'

const TABS = ['All', 'Workflows', 'Folders', 'Tables', 'Knowledge Bases', 'Files']

export const RecentlyDeletedSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('All')

  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Recently Deleted" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsSearchInput placeholder="Search deleted items..." />
        <SettingsButton className="gap-2">
          Deleted (newest first)
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </SettingsButton>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--border-default)] mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-[13px] font-medium transition-all relative",
              activeTab === tab ? "text-white" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Deleted Items List */}
      <div className="space-y-1">
        <SettingsItem
          title="dazzling-shard"
          subtitle="Workflow · Deleted May 14, 2026"
          icon={<div className="w-2.5 h-2.5 rounded-sm bg-pink-500" />}
          action={
            <SettingsButton variant="primary" size="sm" className="opacity-0 group-hover:opacity-100">
              Restore
            </SettingsButton>
          }
        />
      </div>
    </SettingsPageContainer>
  )
}

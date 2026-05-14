import React from 'react'
import { Trash2 } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'

export const SecretsSettings: React.FC = () => {
  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Secrets" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-10">
        <SettingsSearchInput placeholder="Search secrets..." />
        <SettingsButton>Save</SettingsButton>
      </div>

      <div className="space-y-12">
        <SecretSection title="Workspace" />
        <SecretSection title="Personal" />
      </div>
    </SettingsPageContainer>
  )
}

const SecretSection = ({ title }: { title: string }) => (
  <div className="flex flex-col gap-4">
    <span className="text-[13px] font-semibold text-white tracking-tight">{title}</span>
    <div className="flex items-center gap-3">
      <div className="flex-1 h-[32px] px-3 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] flex items-center">
        <span className="text-[13px] text-[var(--text-muted)]">API_KEY</span>
      </div>
      <div className="flex-[1.5] h-[32px] px-3 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] flex items-center">
        <span className="text-[13px] text-[var(--text-muted)]">Enter value</span>
      </div>
      <button className="p-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-red-400 transition-all">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
)

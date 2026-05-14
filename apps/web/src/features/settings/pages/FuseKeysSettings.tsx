import React from 'react'
import { Plus } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsRow, SettingsToggle } from '@/features/settings/components/shared/SettingsControls'

export const FuseKeysSettings: React.FC = () => {
  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Fuse Keys" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <SettingsSearchInput placeholder="Search Fuse keys..." />
        <SettingsButton variant="primary">
          <Plus className="w-3.5 h-3.5" />
          Create
        </SettingsButton>
      </div>

      <div className="flex flex-col items-center justify-center pt-2 pb-8">
        <span className="text-[14px] text-[var(--text-muted)]">
          Click &quot;Create&quot; above to get started
        </span>
      </div>

      <SettingsRow 
        label="Allow personal Fuse keys" 
        hasInfo
        control={<SettingsToggle active={false} />}
      />
    </SettingsPageContainer>
  )
}

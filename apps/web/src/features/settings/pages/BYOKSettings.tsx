import React from 'react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsSection } from '@/features/settings/components/shared/SettingsList'
import { BYOKModal } from '@/features/credentials/BYOKModal'
import { BYOKProviderList } from '@/features/credentials/components/byok-provider-list'
import { useBYOKSettings } from '@/features/credentials/hooks/use-byok-settings'

export const BYOKSettings: React.FC = () => {
  const byok = useBYOKSettings()

  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="BYOK" />
      
      <p className="text-[13px] text-[var(--text-muted)] mb-8">
        Use your own API keys for hosted model providers.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsSearchInput
          placeholder="Search providers..."
          value={byok.searchQuery}
          onChange={(event) => byok.setSearchQuery(event.target.value)}
        />
      </div>

      <SettingsSection label="Model Providers">
        <BYOKProviderList
          rows={byok.rows}
          isLoading={byok.isLoading}
          isSaving={byok.isSaving}
          isDeleting={byok.isDeleting}
          onConnect={(row) => byok.openModal(row.provider)}
          onUpdate={(row) => byok.openModal(row.provider, row.credential)}
          onDelete={byok.deleteKey}
        />
      </SettingsSection>

      <BYOKModal
        isOpen={byok.isModalOpen}
        onClose={byok.closeModal}
        mode={byok.selectedCredential ? 'update' : 'connect'}
        provider={byok.selectedProvider ? {
          id: byok.selectedProvider.id,
          name: byok.selectedProvider.name,
          iconUrl: byok.selectedProvider.icon_url ?? undefined,
          hint: byok.selectedProvider.hint ?? undefined,
        } : null}
        onSave={byok.saveKey}
      />
    </SettingsPageContainer>
  )
}

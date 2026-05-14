import React from 'react'
import { Plus } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsItem, SettingsSection } from '@/features/settings/components/shared/SettingsList'

const INTEGRATIONS = [
  { name: 'Gmail', icon: 'https://www.google.com/images/branding/product/ico/googleg_al_48dp.png' },
  { name: 'Google Drive', icon: '' },
  { name: 'Google Docs', icon: '' },
  { name: 'Google Sheets', icon: '' },
  { name: 'Google Forms', icon: '' },
  { name: 'Google Calendar', icon: '' },
  { name: 'Google Contacts', icon: '' },
  { name: 'Google Ads', icon: '' },
  { name: 'Google BigQuery', icon: '' },
  { name: 'Google Tasks', icon: '' },
  { name: 'Google Vault', icon: '' },
  { name: 'Google Groups', icon: '' },
  { name: 'Google Meet', icon: '' },
  { name: 'Google Service Account', icon: '' },
  { name: 'Vertex AI', icon: '' },
  { name: 'Azure AD', icon: '' },
  { name: 'Microsoft Dataverse', icon: '' },
  { name: 'Microsoft Excel', icon: '' },
]

export const IntegrationsSettings: React.FC = () => {
  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Integrations" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-8">
        <SettingsSearchInput placeholder="Search integrations..." />
        <SettingsButton variant="primary">
          <Plus className="w-3.5 h-3.5" />
          Connect
        </SettingsButton>
      </div>

      <SettingsSection label="Available integrations">
        {INTEGRATIONS.map((item) => (
          <SettingsItem
            key={item.name}
            title={item.name}
            icon={<div className="w-4 h-4 bg-zinc-600 rounded-sm" />}
            action={
              <SettingsButton size="sm">
                Connect
              </SettingsButton>
            }
          />
        ))}
      </SettingsSection>
    </SettingsPageContainer>
  )
}

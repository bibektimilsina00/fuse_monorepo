import React from 'react'
import { Bot, Zap } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsItem, SettingsSection } from '@/features/settings/components/shared/SettingsList'

const COPILOT_KEYS = [
  {
    id: 'primary-assistant',
    name: 'Primary Assistant',
    description: 'Main AI engine for real-time help and code generation',
    icon: Bot,
    status: 'active'
  },
  {
    id: 'background-worker',
    name: 'Background Worker',
    description: 'Key for long-running background tasks and optimizations',
    icon: Zap,
    status: 'inactive'
  }
]

export const CopilotKeysSettings: React.FC = () => {
  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Copilot Keys" />
      
      <p className="text-[13px] text-[var(--text-muted)] mb-8">
        Manage your keys for the Fuse Copilot assistants and background agents.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsSearchInput placeholder="Search keys..." />
      </div>

      <SettingsSection label="Active Keys">
        <div className="flex flex-col gap-1">
          {COPILOT_KEYS.map((key) => (
            <SettingsItem
              key={key.id}
              title={key.name}
              subtitle={key.description}
              icon={
                <div className="w-8 h-8 bg-surface-5 rounded-lg flex items-center justify-center overflow-hidden text-blue-400">
                  <key.icon size={18} />
                </div>
              }
              action={
                <SettingsButton size="sm" variant={key.status === 'active' ? 'secondary' : 'primary'}>
                  {key.status === 'active' ? 'Manage' : 'Activate'}
                </SettingsButton>
              }
            />
          ))}
        </div>
      </SettingsSection>
    </SettingsPageContainer>
  )
}

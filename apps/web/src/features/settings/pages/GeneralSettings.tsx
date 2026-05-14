import React from 'react'
import { 
  ChevronDown,
  Zap
} from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsRow, SettingsToggle, SettingsDivider } from '@/features/settings/components/shared/SettingsControls'
import { SettingsButton } from '@/features/settings/components/shared/SettingsInputs'

export const GeneralSettings: React.FC = () => {
  return (
    <SettingsPageContainer maxWidth="max-w-[800px]">
      <SettingsPageHeader title="General" />

      {/* Profile Section */}
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-white font-medium text-lg border border-[var(--border-default)]">
          BT
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-white">bibek timilsina</span>
            <button className="text-[var(--text-muted)] hover:text-white transition-colors">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
          <span className="text-[13px] text-[var(--text-muted)]">bibektimilsina000@gmail.com</span>
        </div>
      </div>

      <div className="space-y-1">
        <SettingsRow 
          label="Theme" 
          control={
            <SettingsButton className="min-w-[100px] justify-between">
              System
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </SettingsButton>
          }
        />

        <SettingsDivider />

        <SettingsRow 
          label="Auto-connect on drop" 
          description="Automatically connect nodes when dropped near each other"
          hasInfo
          control={<SettingsToggle active />}
        />

        <SettingsRow 
          label="Canvas error notifications" 
          hasInfo
          control={<SettingsToggle active />}
        />

        <SettingsRow 
          label="Snap to grid" 
          control={
            <SettingsButton className="min-w-[100px] justify-between">
              Off
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </SettingsButton>
          }
        />

        <SettingsRow 
          label="Show canvas controls" 
          control={<SettingsToggle active />}
        />

        <SettingsDivider />

        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-white">Allow anonymous telemetry</span>
            <SettingsToggle active />
          </div>
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)] max-w-[500px]">
            We use OpenTelemetry to collect anonymous usage data to improve Fuse. You can opt-out at any time.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-10">
          <SettingsButton>Sign out</SettingsButton>
          <SettingsButton>Reset password</SettingsButton>
        </div>
      </div>
    </SettingsPageContainer>
  )
}

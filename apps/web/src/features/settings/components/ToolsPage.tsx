import React from 'react'
import { Plus } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'

interface ToolsPageProps {
  title: string
  placeholder: string
  emptyText: string
}

export const ToolsPage: React.FC<ToolsPageProps> = ({ title, placeholder, emptyText }) => {
  return (
    <SettingsPageContainer>
      <SettingsPageHeader title={title} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <SettingsSearchInput placeholder={placeholder} />
        <SettingsButton variant="primary">
          <Plus className="w-3.5 h-3.5" />
          Add
        </SettingsButton>
      </div>

      <div className="flex flex-col items-center justify-center pt-2">
        <span className="text-[14px] text-[var(--text-muted)]">{emptyText}</span>
      </div>
    </SettingsPageContainer>
  )
}

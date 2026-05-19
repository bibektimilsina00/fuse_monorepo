import React from 'react'
import { Key, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsItem } from '@/features/settings/components/shared/SettingsList'
import type { BYOKProviderRowModel } from '@/features/credentials/hooks/use-byok-settings'

interface BYOKProviderRowProps {
  row: BYOKProviderRowModel
  disabled?: boolean
  isDeleting?: boolean
  onConnect: (row: BYOKProviderRowModel) => void
  onUpdate: (row: BYOKProviderRowModel) => void
  onDelete: (row: BYOKProviderRowModel) => void
}

export const BYOKProviderRow: React.FC<BYOKProviderRowProps> = ({
  row,
  disabled = false,
  isDeleting = false,
  onConnect,
  onUpdate,
  onDelete,
}) => {
  const { provider, credential } = row

  return (
    <SettingsItem
      title={provider.name}
      subtitle={credential ? `Connected · ${credential.name}` : provider.description}
      icon={
        provider.icon_url ? (
          <img src={provider.icon_url} alt={provider.name} className="w-5 h-5 object-contain" />
        ) : (
          <Key size={18} className="text-text-muted" />
        )
      }
      action={
        credential ? (
          <div className="flex items-center gap-2">
            <SettingsButton
              size="sm"
              variant="secondary"
              onClick={() => onUpdate(row)}
              disabled={disabled}
            >
              Update
            </SettingsButton>
            <IconButton
              icon={<Trash2 size={14} />}
              tooltip={`Delete ${provider.name} key`}
              variant="danger"
              onClick={() => onDelete(row)}
              disabled={isDeleting}
            />
          </div>
        ) : (
          <SettingsButton
            size="sm"
            variant="primary"
            onClick={() => onConnect(row)}
            disabled={disabled}
          >
            Connect
          </SettingsButton>
        )
      }
    />
  )
}

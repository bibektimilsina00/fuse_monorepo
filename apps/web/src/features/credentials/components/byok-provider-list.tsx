import React from 'react'
import { Spinner } from '@/components/ui'
import { BYOKProviderRow } from '@/features/credentials/components/byok-provider-row'
import type { BYOKProviderRowModel } from '@/features/credentials/hooks/use-byok-settings'

interface BYOKProviderListProps {
  rows: BYOKProviderRowModel[]
  isLoading: boolean
  isSaving: boolean
  isDeleting: boolean
  onConnect: (row: BYOKProviderRowModel) => void
  onUpdate: (row: BYOKProviderRowModel) => void
  onDelete: (row: BYOKProviderRowModel) => void
}

export const BYOKProviderList: React.FC<BYOKProviderListProps> = ({
  rows,
  isLoading,
  isSaving,
  isDeleting,
  onConnect,
  onUpdate,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner size="md" color="accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map(row => (
        <BYOKProviderRow
          key={row.provider.id}
          row={row}
          disabled={isSaving}
          isDeleting={isDeleting}
          onConnect={onConnect}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

import { useMemo, useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui'
import { useCreateCredential, useCredentials, useDeleteCredential } from '@/hooks/credentials/queries'
import api from '@/lib/api/client'
import type { Credential } from '@/lib/api/contracts'
import { logger } from '@/lib/logger'

export interface BYOKProvider {
  id: string
  name: string
  description: string
  icon_url?: string | null
  hint?: string | null
}

export interface BYOKProviderRowModel {
  provider: BYOKProvider
  credential: Credential | null
}

export function useBYOKSettings() {
  const confirm = useConfirm()
  const [providers, setProviders] = useState<BYOKProvider[]>([])
  const [isProvidersLoading, setIsProvidersLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<BYOKProvider | null>(null)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const createCredential = useCreateCredential()
  const deleteCredential = useDeleteCredential()
  const { data: credentials = [], isLoading: isCredentialsLoading } = useCredentials()

  useEffect(() => {
    const fetchProviders = async () => {
      setIsProvidersLoading(true)
      try {
        const response = await api.get('/credentials/providers')
        setProviders(response.data.filter((provider: BYOKProvider) => provider.id.includes('api_key')))
      } catch (err) {
        logger.error('Failed to fetch BYOK providers:', err)
      } finally {
        setIsProvidersLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const credentialsByType = useMemo(() => {
    return credentials.reduce<Record<string, Credential>>((acc, credential) => {
      acc[credential.type] = credential
      return acc
    }, {})
  }, [credentials])

  const rows = useMemo<BYOKProviderRowModel[]>(() => {
    const query = searchQuery.trim().toLowerCase()
    return providers
      .filter(provider => {
        if (!query) return true
        return (
          provider.name.toLowerCase().includes(query) ||
          provider.description.toLowerCase().includes(query) ||
          provider.id.toLowerCase().includes(query)
        )
      })
      .map(provider => ({
        provider,
        credential: credentialsByType[provider.id] ?? null,
      }))
  }, [credentialsByType, providers, searchQuery])

  const openModal = (provider: BYOKProvider, credential: Credential | null = null) => {
    setSelectedProvider(provider)
    setSelectedCredential(credential)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedProvider(null)
    setSelectedCredential(null)
  }

  const saveKey = async (key: string) => {
    if (!selectedProvider) return

    if (selectedCredential) {
      await deleteCredential.mutateAsync(selectedCredential.id)
    }

    await createCredential.mutateAsync({
      name: `${selectedProvider.name} BYOK`,
      type: selectedProvider.id,
      data: { api_key: key },
    })
    setSelectedCredential(null)
  }

  const deleteKey = async (row: BYOKProviderRowModel) => {
    if (!row.credential) return

    const ok = await confirm({
      title: `Delete ${row.provider.name} key`,
      message: `Remove the saved ${row.provider.name} API key? Agent nodes using it will fail until another key is selected.`,
      confirmText: 'Delete',
      type: 'danger',
    })

    if (ok) {
      await deleteCredential.mutateAsync(row.credential.id)
    }
  }

  return {
    rows,
    searchQuery,
    setSearchQuery,
    isLoading: isProvidersLoading || isCredentialsLoading,
    isSaving: createCredential.isPending || deleteCredential.isPending,
    isDeleting: deleteCredential.isPending,
    selectedProvider,
    selectedCredential,
    isModalOpen,
    openModal,
    closeModal,
    saveKey,
    deleteKey,
  }
}

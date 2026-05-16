import React, { useState, useEffect } from 'react'
import { Key } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { Spinner } from '@/components/ui'
import { SettingsItem, SettingsSection } from '@/features/settings/components/shared/SettingsList'
import { BYOKModal } from '@/features/credentials/BYOKModal'
import { useCreateCredential } from '@/hooks/credentials/queries'
import api from '@/lib/api/client'
import { logger } from '@/lib/logger'

export const BYOKSettings: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const createCredential = useCreateCredential()

  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true)
      try {
        const response = await api.get('/credentials/providers')
        // Filter for BYOK providers (usually api_key based and model-focused)
        setProviders(response.data.filter((p: any) => p.id.includes('api_key')))
      } catch (err) {
        logger.error('Failed to fetch BYOK providers:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const handleConnect = (provider: any) => {
    setSelectedProvider(provider)
    setIsModalOpen(true)
  }

  const handleSaveKey = async (key: string) => {
    if (!selectedProvider) return
    
    await createCredential.mutateAsync({
      name: `${selectedProvider.name} BYOK`,
      type: selectedProvider.id,
      data: { api_key: key }
    })
  }

  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="BYOK" />
      
      <p className="text-[13px] text-[var(--text-muted)] mb-8">
        Use your own API keys for hosted model providers.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsSearchInput placeholder="Search providers..." />
      </div>

      <SettingsSection label="Model Providers">
        <div className="flex flex-col gap-1">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" color="accent" />
            </div>
          ) : (
            providers.map((provider) => (
              <SettingsItem
                key={provider.id}
                title={provider.name}
                subtitle={provider.description}
                icon={
                  <div className="w-8 h-8 bg-surface-5 rounded-lg flex items-center justify-center overflow-hidden">
                    {provider.icon_url ? (
                      <img src={provider.icon_url} alt={provider.name} className="w-5 h-5 object-contain" />
                    ) : (
                      <Key size={18} className="text-text-muted" />
                    )}
                  </div>
                }
                action={
                  <SettingsButton size="sm" variant="primary" onClick={() => handleConnect(provider)}>
                    Connect
                  </SettingsButton>
                }
              />
            ))
          )}
        </div>
      </SettingsSection>

      <BYOKModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        provider={selectedProvider}
        onSave={handleSaveKey}
      />
    </SettingsPageContainer>
  )
}

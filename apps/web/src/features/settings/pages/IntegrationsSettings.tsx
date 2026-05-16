import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Key, RefreshCw } from 'lucide-react'
import { SettingsPageContainer, SettingsPageHeader } from '@/features/settings/components/shared/SettingsLayout'
import { SettingsSearchInput, SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { SettingsItem, SettingsSection } from '@/features/settings/components/shared/SettingsList'
import AddCredentialModal from '@/features/credentials/AddCredentialModal'
import { useCredentialsManagement } from '@/features/credentials/hooks/use-credentials-management'
import api from '@/lib/api/client'

export const IntegrationsSettings: React.FC = () => {
  const {
    credentials,
    isLoading: isCredentialsLoading,
    isDeleting,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    selectedService,
    setSelectedService,
    openModal,
    closeModal,
    handleDelete,
    refresh
  } = useCredentialsManagement()

  const [supportedProviders, setSupportedProviders] = useState<any[]>([])
  const [isProvidersLoading, setIsProvidersLoading] = useState(false)

  // Fetch providers directly for the list
  useEffect(() => {
    const fetchProviders = async () => {
      setIsProvidersLoading(true)
      try {
        const response = await api.get('/credentials/providers')
        // Only show integrations (not byok types) in this list
        setSupportedProviders(response.data.filter((p: any) => p.id.includes('oauth') || p.id === 'github_pat'))
      } catch (err) {
        console.error('Failed to fetch providers:', err)
      } finally {
        setIsProvidersLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const handleConnectProvider = (provider: any) => {
    setSelectedService(provider)
    openModal()
  }

  const handleOpenMainConnect = () => {
    setSelectedService(null)
    openModal()
  }

  const getServiceIcon = (type: string) => {
    const service = supportedProviders.find(p => p.id === type || p.id.startsWith(type.split('_')[0]))
    if (service?.icon_url) {
      return <img src={service.icon_url} alt={service.name} className="w-5 h-5 object-contain" />
    }
    return <Key size={18} />
  }

  return (
    <SettingsPageContainer>
      <SettingsPageHeader title="Integrations" />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-8">
          <SettingsSearchInput 
            placeholder="Search your integrations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={18} className={isCredentialsLoading ? 'animate-spin' : ''} />
            </button>
            <SettingsButton variant="primary" onClick={handleOpenMainConnect}>
              <Plus className="w-3.5 h-3.5" />
              Connect
            </SettingsButton>
          </div>
        </div>

        <SettingsSection label="Available integrations">
          <div className="flex flex-col gap-1">
            {isProvidersLoading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              supportedProviders.map((provider) => (
                <SettingsItem
                  key={provider.id}
                  title={provider.name}
                  subtitle={provider.description}
                  icon={
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                      {provider.icon_url ? (
                        <img src={provider.icon_url} alt={provider.name} className="w-5 h-5 object-contain" />
                      ) : (
                        <Key size={18} className="text-zinc-400" />
                      )}
                    </div>
                  }
                  action={
                    <SettingsButton size="sm" variant="primary" onClick={() => handleConnectProvider(provider)}>
                      Connect
                    </SettingsButton>
                  }
                />
              ))
            )}
          </div>
        </SettingsSection>

        <SettingsSection label="Your Connected Accounts" className="mt-8">
          {isCredentialsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading integrations...</p>
            </div>
          ) : credentials.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-500 mb-4">
                <Key size={24} />
              </div>
              <p className="text-sm text-zinc-400">
                {searchQuery ? "No integrations match your search." : "No connected accounts yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {credentials.map((cred) => (
                <SettingsItem
                  key={cred.id}
                  title={cred.name}
                  subtitle={`${cred.type.replace(/_/g, ' ').toUpperCase()} · Added ${new Date(cred.created_at).toLocaleDateString()}`}
                  icon={
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                      {getServiceIcon(cred.type)}
                    </div>
                  }
                  action={
                    <button
                      onClick={() => handleDelete(cred.id)}
                      disabled={isDeleting}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete integration"
                    >
                      <Trash2 size={16} />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </SettingsSection>
      </div>

      {/* Unified Integration Modal (Selection or Configuration) */}
      <AddCredentialModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        initialService={selectedService}
        allowedProviders={supportedProviders}
      />
    </SettingsPageContainer>
  )
}

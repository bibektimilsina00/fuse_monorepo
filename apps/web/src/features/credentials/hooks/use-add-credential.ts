import { useState, useEffect } from 'react'
import { Globe, Shield, Lock, type LucideIcon } from 'lucide-react'
import { useCreateCredential } from '@/hooks/credentials/queries'
import api from '@/lib/api/client'

export interface CredentialField {
  id: string
  label: string
  type: string
  placeholder: string
}

export interface SupportedService {
  id: string
  name: string
  type: 'oauth' | 'api_key'
  icon?: LucideIcon
  icon_url?: string
  description: string
  fields?: CredentialField[]
  hint?: string
  scopes?: string[]
}

export function useAddCredential(onClose: () => void, initialService?: SupportedService | null) {
  const [step, setStep] = useState<'select' | 'form'>(initialService ? 'form' : 'select')
  const [selectedService, setSelectedService] = useState<SupportedService | null>(initialService || null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [name, setName] = useState(initialService ? `${initialService.name} Integration` : '')
  const [description, setDescription] = useState('')
  const [supportedServices, setSupportedServices] = useState<SupportedService[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const createCredential = useCreateCredential()

  useEffect(() => {
    if (initialService) {
      setStep('form')
      setSelectedService(initialService)
      setName(`${initialService.name} Integration`)
    } else {
      setStep('select')
      setSelectedService(null)
      setName('')
    }
  }, [initialService])

  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true)
      try {
        const response = await api.get('/credentials/providers')
        setSupportedServices(response.data)
      } catch (err) {
        console.error('Failed to fetch providers:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const handleServiceSelect = async (service: SupportedService) => {
    setSelectedService(service)
    setStep('form')
    setName(`${service.name} Integration`)
  }

  const handleOAuthStart = async () => {
    if (!selectedService) return

    try {
      // Store metadata in session to retrieve after redirect
      sessionStorage.setItem('fuse_oauth_pending_metadata', JSON.stringify({
        name,
        description
      }))

      const serviceId = selectedService.id.split('_')[0]
      const response = await api.get(`/credentials/oauth/${serviceId}/url`, {
        params: {
          name,
          description
        }
      })
      if (response.data.url) {
        window.location.href = response.data.url
      }
    } catch (err) {
      console.error('Failed to start OAuth flow:', err)
    }
  }

  const reset = () => {
    setStep('select')
    setSelectedService(null)
    setFormData({})
    setName('')
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return

    try {
      await createCredential.mutateAsync({
        name,
        type: selectedService.id,
        data: formData,
        meta: { description }
      })
      onClose()
      reset()
    } catch (err) {
      console.error('Failed to create credential:', err)
    }
  }

  return {
    step,
    setStep,
    selectedService,
    formData,
    setFormData,
    name,
    setName,
    description,
    setDescription,
    isPending: createCredential.isPending,
    isLoading,
    handleServiceSelect,
    handleOAuthStart,
    handleSubmit,
    supportedServices,
    reset
  }
}

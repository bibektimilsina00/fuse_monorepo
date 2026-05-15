import React, { useState } from 'react'
import { X, Shield, Lock, Key, Globe, Info } from 'lucide-react'
import { useCreateCredential } from '@/hooks/credentials/queries'

interface AddCredentialModalProps {
  isOpen: boolean
  onClose: () => void
}

const SUPPORTED_SERVICES = [
  {
    id: 'slack_oauth',
    name: 'Slack',
    type: 'oauth',
    icon: Globe,
    description: 'Connect to your Slack workspace using OAuth 2.0',
  },
  {
    id: 'openai_api_key',
    name: 'OpenAI',
    type: 'api_key',
    icon: Shield,
    description: 'Use your OpenAI API key for AI nodes',
    fields: [{ id: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' }],
  },
  {
    id: 'github_pat',
    name: 'GitHub',
    type: 'api_key',
    icon: Lock,
    description: 'Connect using a Personal Access Token',
    fields: [{ id: 'token', label: 'Access Token', type: 'password', placeholder: 'ghp_...' }],
  },
]

export default function AddCredentialModal({ isOpen, onClose }: AddCredentialModalProps) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [selectedService, setSelectedService] = useState<(typeof SUPPORTED_SERVICES)[0] | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const createCredential = useCreateCredential()

  if (!isOpen) return null

  const handleServiceSelect = (service: (typeof SUPPORTED_SERVICES)[0]) => {
    setSelectedService(service)
    if (service.type === 'oauth') {
      // Redirect to OAuth flow
      window.location.href = `http://localhost:8000/api/v1/credentials/oauth/${service.id.split('_')[0]}/url`
    } else {
      setStep('form')
      setName(`${service.name} Credential`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return

    try {
      await createCredential.mutateAsync({
        name,
        type: selectedService.id,
        data: formData,
      })
      onClose()
      setStep('select')
      setSelectedService(null)
      setFormData({})
    } catch (err) {
      console.error('Failed to create credential:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === 'select' ? 'Add Credential' : `Configure ${selectedService?.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' ? (
            <div className="grid gap-3">
              {SUPPORTED_SERVICES.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="flex items-start gap-4 p-4 text-left border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <service.icon size={24} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{service.name}</div>
                    <div className="text-sm text-slate-500">{service.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="e.g. Production OpenAI Key"
                  required
                />
              </div>

              {selectedService?.fields?.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.id] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    placeholder={field.placeholder}
                    required
                  />
                </div>
              ))}

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Your credentials are encrypted at rest using AES-256 and are never stored in plain text.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={createCredential.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  {createCredential.isPending ? 'Saving...' : 'Save Credential'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { X, ChevronLeft, Check, Key } from 'lucide-react'
import { useAddCredential } from '@/features/credentials/hooks/use-add-credential'
import { SettingsButton } from '@/features/settings/components/shared/SettingsInputs'
import { Spinner, IconButton } from '@/components/ui'

interface AddCredentialModalProps {
  isOpen: boolean
  onClose: () => void
  initialService?: any
  allowedProviders?: any[]
}

export default function AddCredentialModal({ isOpen, onClose, initialService, allowedProviders }: AddCredentialModalProps) {
  const {
    step,
    setStep,
    selectedService,
    formData,
    setFormData,
    name,
    setName,
    description,
    setDescription,
    isLoading,
    handleServiceSelect,
    handleSubmit,
    handleOAuthStart,
    supportedServices,
    reset
  } = useAddCredential(onClose, initialService)

  // Use allowedProviders if provided, otherwise fallback to all supportedServices
  const displayProviders = allowedProviders || supportedServices

  if (!isOpen) return null

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-surface-modal border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="min-w-0 font-medium text-white text-base flex items-center gap-2.5">
            {step !== 'select' && (
              <IconButton
                icon={<ChevronLeft size={16} />}
                onClick={() => setStep('select')}
                size="xs"
                className="text-white/40 hover:text-white hover:bg-white/5"
              />
            )}
            <span>{step === 'select' ? 'Add Integration' : `Connect ${selectedService?.name}`}</span>
          </h2>
          <IconButton
            icon={<X size={16} />}
            onClick={handleClose}
            size="xs"
            className="text-white/40 hover:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {step === 'select' ? (
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <Spinner size="md" color="accent" />
                </div>
              ) : (
                displayProviders.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="flex items-center gap-4 p-3 text-left border border-white/5 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
                      {service.icon_url ? (
                        <img src={service.icon_url} alt={service.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Key size={20} className="text-white/40 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-white">{service.name}</div>
                      <div className="text-[11px] text-white/40">{service.description}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Service Identity Section */}
              <div className="flex items-center gap-4">
                <div className="flex size-[48px] flex-shrink-0 items-center justify-center rounded-[12px] bg-white/5 border border-white/10 overflow-hidden">
                  {selectedService?.icon_url ? (
                    <img src={selectedService.icon_url} alt={selectedService.name} className="size-[24px] object-contain" />
                  ) : (
                    <Key size={24} className="text-white/40" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[14px] text-white">Connect your {selectedService?.name} account</p>
                  <p className="text-[12px] text-white/40">Grant access to use {selectedService?.name} in your workflows</p>
                </div>
              </div>

              {/* Permissions Section (Only for OAuth or if scopes exist) */}
              {(selectedService?.type === 'oauth' || selectedService?.scopes) && (
                <div className="rounded-[12px] border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="border-white/5 border-b px-4 py-3 bg-white/[0.02]">
                    <h4 className="font-semibold text-[12px] text-white/60 tracking-wide uppercase">Permissions requested</h4>
                  </div>
                  <ul className="max-h-[160px] space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar">
                    {(selectedService?.scopes || [
                      "Connect this service to your workflows",
                      "Allow automation to perform actions on your behalf"
                    ]).map((perm: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-[16px] flex-shrink-0 items-center justify-center">
                          <Check size={14} className="text-white/40" />
                        </div>
                        <span className="text-[12px] text-white/80">{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-white/40 uppercase tracking-widest px-1">Display name*</label>
                  <input 
                    className="w-full h-[40px] px-3 rounded-lg bg-surface-editor border border-white/10 text-[13px] text-white placeholder:text-white/20 focus:outline-none transition-all shadow-inner"
                    placeholder="Integration name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-white/40 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    className="w-full min-h-[80px] p-3 rounded-lg bg-surface-editor border border-white/10 text-[13px] text-white placeholder:text-white/20 focus:outline-none transition-all shadow-inner resize-none"
                    placeholder="Optional description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {selectedService?.type === 'api_key' && selectedService.fields?.map((field: any) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[12px] font-bold text-white/40 uppercase tracking-widest px-1">{field.label}</label>
                    <input 
                      type={field.type}
                      className="w-full h-[40px] px-3 rounded-lg bg-surface-editor border border-white/10 text-[13px] text-white placeholder:text-white/20 focus:outline-none transition-all shadow-inner"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/5 bg-white/[0.02] px-4 py-4">
          <SettingsButton 
            variant="secondary" 
            size="sm" 
            onClick={step === 'select' ? handleClose : () => setStep('select')}
          >
            {step === 'select' ? 'Cancel' : 'Back'}
          </SettingsButton>
          <SettingsButton 
            variant="primary" 
            size="sm"
            disabled={step === 'form' && !name.trim()}
            onClick={step === 'select' ? undefined : (selectedService?.type === 'oauth' ? handleOAuthStart : handleSubmit)}
          >
            {step === 'select' ? 'Connect' : (selectedService?.type === 'oauth' ? 'Connect' : 'Save')}
          </SettingsButton>
        </div>
      </div>
    </div>
  )
}

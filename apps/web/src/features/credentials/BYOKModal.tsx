import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsButton } from '@/features/settings/components/shared/SettingsInputs'

interface BYOKModalProps {
  isOpen: boolean
  onClose: () => void
  provider: {
    id: string
    name: string
    iconUrl?: string
    hint?: string
  } | null
  onSave: (key: string) => Promise<void>
}

export const BYOKModal: React.FC<BYOKModalProps> = ({ isOpen, onClose, provider, onSave }) => {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is mounted before focusing
      // Using requestAnimationFrame to be smoother
      const timer = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      setShowKey(false)
      setKey('')
      return () => cancelAnimationFrame(timer)
    }
  }, [isOpen])

  if (!isOpen || !provider) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setIsSaving(true)
    try {
      await onSave(key)
      setKey('')
      onClose()
    } catch (err) {
      console.error('Failed to save BYOK key:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[480px] bg-[#1c1c1c] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/5 bg-black/10 flex items-center gap-3">
          <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
            {provider.iconUrl ? (
              <img src={provider.iconUrl} alt={provider.name} className="w-4 h-4 object-contain" />
            ) : (
              <Key className="text-white/40" size={14} />
            )}
          </div>
          <h2 className="text-[14px] font-semibold text-white tracking-tight">
            Enter your {provider.name} API key
          </h2>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <p className="text-[13px] text-white/40 mb-5 leading-relaxed">
            This key will be used for all {provider.name} requests in this workspace. 
            Your key is encrypted and stored securely.
          </p>

          <div className="relative group mb-6">
            <input
              ref={inputRef}
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider.hint || `Paste your ${provider.name} key here...`}
              className="w-full h-[36px] px-4 pr-10 rounded-lg bg-[#222] border border-white/10 text-[13px] text-white placeholder:text-white/20 outline-none focus:outline-none focus:ring-0 focus:border-white/10 transition-none shadow-inner select-none"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors outline-none focus:outline-none"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <SettingsButton 
              type="button"
              variant="secondary" 
              size="sm"
              onClick={onClose}
            >
              Cancel
            </SettingsButton>
            <SettingsButton 
              type="submit"
              variant="primary" 
              size="sm"
              disabled={isSaving || !key.trim()}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save"
              )}
            </SettingsButton>
          </div>
        </form>
      </div>
    </div>
  )
}

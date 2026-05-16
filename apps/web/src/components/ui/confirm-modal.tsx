import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise<boolean>((res) => {
      setResolve(() => res)
    })
  }, [])

  const handleClose = (value: boolean) => {
    setIsOpen(false)
    resolve?.(value)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-300"
          onClick={() => handleClose(false)}
        >
          <div 
            className="w-full max-w-[400px] bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center",
                  options.type === 'danger' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-bold text-white leading-tight mb-1">
                    {options.title}
                  </h3>
                  <p className="text-[14px] text-white/60 leading-relaxed">
                    {options.message}
                  </p>
                </div>
                <button 
                  onClick={() => handleClose(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 h-10 rounded-xl text-[14px] font-semibold text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={cn(
                  "px-6 h-10 rounded-xl text-[14px] font-bold text-white shadow-lg transition-all active:scale-95",
                  options.type === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-[var(--brand-accent)] hover:opacity-90 shadow-[var(--brand-accent)]/20"
                )}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

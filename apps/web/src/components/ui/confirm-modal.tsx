import React, { useState, useCallback, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ConfirmContext, type ConfirmOptions } from '@/components/ui/confirm-context'
import { cn } from '@/lib/utils'

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
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => handleClose(false)}
        >
          <div 
            className="w-full max-w-[400px] bg-surface-modal border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  options.type === 'danger' ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold text-white leading-tight mb-1">
                    {options.title}
                  </h3>
                  <p className="text-[13px] text-text-muted leading-relaxed">
                    {options.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-0 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 h-9 rounded-md text-[13px] font-medium text-text-muted hover:text-white transition-all"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={cn(
                  "px-5 h-9 rounded-md text-[13px] font-bold text-white transition-all active:scale-95",
                  options.type === 'danger' ? "bg-red-600 hover:bg-red-700" : "bg-surface-5 hover:bg-surface-6"
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

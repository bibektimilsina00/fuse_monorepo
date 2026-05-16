import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const maxWidthClasses = {
  sm:  'max-w-[360px]',
  md:  'max-w-[440px]',
  lg:  'max-w-[560px]',
  xl:  'max-w-[720px]',
  '2xl': 'max-w-[900px]',
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  maxWidth?: keyof typeof maxWidthClasses
  showClose?: boolean
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'md',
  showClose = true,
  className,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-[var(--surface-2)] border border-[var(--border-default)]',
          'rounded-[12px] p-8 shadow-2xl',
          'animate-in zoom-in-95 fade-in duration-200',
          maxWidthClasses[maxWidth],
          className,
        )}
      >
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="size-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

Modal.Header = function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="text-[var(--text-muted)] text-[14px] leading-relaxed mt-1">{subtitle}</p>}
    </div>
  )
}

Modal.Body = function ModalBody({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

Modal.Footer = function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex items-center gap-3', className)}>{children}</div>
}

// Allow dot-notation types
declare module './modal' {
  interface Modal {
    Header: typeof Modal.Header
    Body: typeof Modal.Body
    Footer: typeof Modal.Footer
  }
}

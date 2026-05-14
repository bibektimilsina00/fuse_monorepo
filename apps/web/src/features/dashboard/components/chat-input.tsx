import React, { useRef, useEffect, useState } from 'react'
import { Plus, Paperclip, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  placeholder?: string
  onSend?: (message: string) => void
  onChange?: (value: string) => void
  className?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  placeholder = "Ask Fuse anything...", 
  onSend,
  onChange,
  className
}) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend?.(value)
        setValue('')
      }
    }
  }

  return (
    <div className={cn("w-full max-w-[42rem] mx-auto", className)}>
      <div 
        role="group" 
        aria-label="Message input" 
        className="relative z-10 w-full cursor-text rounded-[20px] border border-[var(--border-default)] bg-[var(--surface-4)] px-2.5 py-2 shadow-sm focus-within:border-[var(--border-strong)] transition-all"
      >
        <div className="relative">
          <textarea 
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              onChange?.(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="m-0 box-border h-auto min-h-[32px] w-full resize-none overflow-y-auto overflow-x-hidden break-words border-0 bg-transparent px-1 py-1 font-body text-[15px] leading-[24px] tracking-[-0.015em] text-[var(--text-primary)] outline-none placeholder:font-[380] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0 max-h-[30vh] custom-scrollbar"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button 
              type="button" 
              className="flex size-[28px] items-center justify-center rounded-full border border-[var(--border-default)] transition-colors hover:bg-[var(--surface-hover)] text-[var(--text-icon)]" 
              title="Add attachments or resources"
            >
              <Plus className="size-[16px]" strokeWidth={1.75} />
            </button>
            <button 
              type="button" 
              className="flex size-[28px] items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-hover)] text-[var(--text-icon)]" 
              aria-label="Attach file"
            >
              <Paperclip className="size-[14px]" strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                if (value.trim()) {
                  onSend?.(value)
                  setValue('')
                }
              }}
              className={cn(
                "inline-flex items-center justify-center size-[28px] rounded-full border-0 p-0 transition-colors",
                value.trim() ? "bg-white text-black" : "bg-[var(--text-muted)] text-black opacity-50 cursor-not-allowed"
              )}
              disabled={!value.trim()}
            >
              <ArrowUp className="block size-[16px]" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

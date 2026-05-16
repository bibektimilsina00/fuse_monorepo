import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export const CustomSelect = ({ value, options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options?.find((o: any) => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-editor border border-border rounded-md px-3 h-[32px] flex items-center justify-between cursor-pointer hover:border-border-strong transition-all"
      >
        <span className={cn("text-[12px]", value ? "text-white" : "text-text-muted")}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-editor border border-border rounded-md shadow-xl z-50 overflow-hidden py-1">
          {options?.map((opt: any) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className="px-3 py-1.5 text-[12px] text-white hover:bg-surface-5 cursor-pointer transition-colors"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

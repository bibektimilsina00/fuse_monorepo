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
        className="w-full bg-[#222] border border-[#333] rounded-md px-3 h-[32px] flex items-center justify-between cursor-pointer hover:border-[#444] transition-all"
      >
        <span className={cn("text-[12px]", value ? "text-white" : "text-[#666]")}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#666]" />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#222] border border-[#333] rounded-md shadow-xl z-50 overflow-hidden py-1">
          {options?.map((opt: any) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className="px-3 py-1.5 text-[12px] text-white hover:bg-[#333] cursor-pointer transition-colors"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

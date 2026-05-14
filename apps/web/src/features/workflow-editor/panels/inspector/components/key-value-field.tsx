import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export const KeyValueField = ({ value, onChange }: { value: any, onChange: (val: any) => void }) => {
  const [pairs, setPairs] = useState<{key: string, value: string}[]>(() => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const entries = Object.entries(value).map(([k, v]) => ({ key: k, value: String(v) }))
      return entries.length > 0 ? [...entries, { key: '', value: '' }] : [{ key: '', value: '' }, { key: '', value: '' }]
    }
    return [{ key: '', value: '' }, { key: '', value: '' }]
  })

  const syncToParent = (currentPairs: {key: string, value: string}[]) => {
    const newObj: Record<string, string> = {}
    currentPairs.forEach(p => {
      if (p.key.trim()) {
        newObj[p.key.trim()] = p.value
      }
    })
    onChange(newObj)
  }

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    const newPairs = [...pairs]
    newPairs[index][field] = val
    
    // Auto-add new empty row if the last row is being typed into
    const isLast = index === newPairs.length - 1
    if (isLast && (newPairs[index].key || newPairs[index].value)) {
      newPairs.push({ key: '', value: '' })
    }

    setPairs(newPairs)
    syncToParent(newPairs)
  }

  const handleDelete = (index: number) => {
    if (pairs.length === 1) return // Keep at least one row
    const newPairs = pairs.filter((_, i) => i !== index)
    setPairs(newPairs)
    syncToParent(newPairs)
  }

  return (
    <div className="flex flex-col border border-[#333] rounded-md overflow-hidden bg-[#222]">
      <div className="flex bg-[#1a1a1a] border-b border-[#333]">
        <div className="flex-1 py-1.5 px-2 text-[11px] font-bold text-[#888]">Key</div>
        <div className="w-[1px] bg-[#333] flex-shrink-0" />
        <div className="flex-1 py-1.5 px-2 text-[11px] font-bold text-[#888]">Value</div>
        <div className="w-8 flex-shrink-0" /> {/* Match delete button width */}
      </div>
      {pairs.map((pair, idx) => {
        const isLast = idx === pairs.length - 1
        return (
          <div key={idx} className={cn("flex group", !isLast && "border-b border-[#333]")}>
            <input
              value={pair.key}
              onChange={e => handleChange(idx, 'key', e.target.value)}
              placeholder="Key"
              className="flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white focus:outline-none placeholder:text-[#555] min-w-0"
            />
            <div className="w-[1px] bg-[#333] flex-shrink-0" />
            <input
              value={pair.value}
              onChange={e => handleChange(idx, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white focus:outline-none placeholder:text-[#555] min-w-0"
            />
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              {!isLast && (
                <button 
                  onClick={() => handleDelete(idx)}
                  className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-500 transition-all p-1"
                  title="Remove field"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

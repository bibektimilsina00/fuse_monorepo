import React from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

interface Condition {
  id: string
  label: string
  expression: string
}

interface ConditionListFieldProps {
  value: Condition[]
  onChange: (value: Condition[]) => void
}

export const ConditionListField: React.FC<ConditionListFieldProps> = ({ value = [], onChange }) => {
  const addCondition = () => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      label: 'Else If',
      expression: ''
    }
    onChange([...value, newCondition])
  }

  const removeCondition = (index: number) => {
    if (value.length <= 1 && index === 0) return // Keep at least 'If'
    const newValue = [...value]
    newValue.splice(index, 1)
    
    // Ensure first one is always 'If'
    if (newValue.length > 0) {
      newValue[0].label = 'If'
    }
    
    onChange(newValue)
  }

  const moveCondition = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === value.length - 1) return
    
    // Deep clone to avoid mutations
    const newValue = value.map(c => ({ ...c }))
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    const [movedItem] = newValue.splice(index, 1)
    newValue.splice(targetIndex, 0, movedItem)
    
    // Fix labels based on new positions
    const finalValue = newValue.map((c, i) => ({
      ...c,
      label: i === 0 ? 'If' : 'Else If'
    }))
    
    onChange(finalValue)
  }

  const updateExpression = (index: number, expression: string) => {
    const newValue = [...value]
    newValue[index] = { ...newValue[index], expression }
    onChange(newValue)
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((cond, index) => (
        <div 
          key={cond.id} 
          className="flex flex-col rounded-lg border border-[#333] bg-[#222] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 h-9 border-b border-[#333] bg-[#2a2a2a]">
            <span className="text-[12px] font-bold text-white capitalize">{cond.label}</span>
            
            <div className="flex items-center gap-1">
              <Tooltip content="Add branch">
                <button 
                  onClick={() => addCondition()}
                  className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Move up" disabled={index === 0}>
                <button 
                  onClick={() => moveCondition(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-white transition-colors disabled:opacity-10"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Move down" disabled={index === value.length - 1}>
                <button 
                  onClick={() => moveCondition(index, 'down')}
                  disabled={index === value.length - 1}
                  className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-white transition-colors disabled:opacity-10"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Remove branch">
                <button 
                  onClick={() => removeCondition(index)}
                  className="p-1.5 rounded hover:bg-[#333] text-[#666] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Editor */}
          <div className="">
            <div className="w-full bg-transparent overflow-hidden">
              <Editor
                value={cond.expression}
                onValueChange={(code) => updateExpression(index, code)}
                highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
                padding={8}
                className="prism-editor min-h-[60px] focus:outline-none"
                textareaClassName="focus:outline-none"
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 12,
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Else Branch (Static) */}
      <div className="flex flex-col rounded-lg border border-[#333] bg-[#222] opacity-80">
        <div className="flex items-center justify-between px-3 h-9 bg-[#2a2a2a]">
          <span className="text-[12px] font-bold text-white capitalize">Else</span>
          <span className="text-[10px] text-[#555] font-medium">Default path</span>
        </div>
      </div>
    </div>
  )
}

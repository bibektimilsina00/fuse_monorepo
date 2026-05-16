import React from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { CustomSelect } from '@/features/workflow-editor/panels/inspector/components/custom-select'

interface SchemaItem {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
  description: string
  defaultValue: any
  isExpanded?: boolean
}

interface SchemaEditorFieldProps {
  value: SchemaItem[]
  onChange: (value: SchemaItem[]) => void
}

const TYPE_OPTIONS = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'JSON', value: 'json' },
]

export const SchemaEditorField: React.FC<SchemaEditorFieldProps> = ({ value = [], onChange }) => {
  const addItem = () => {
    const newItem: SchemaItem = {
      id: crypto.randomUUID(),
      name: `input${value.length + 1}`,
      type: 'string',
      description: '',
      defaultValue: '',
      isExpanded: true,
    }
    onChange([...value, newItem])
  }

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, updates: Partial<SchemaItem>) => {
    onChange(value.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const toggleExpand = (id: string) => {
    onChange(value.map((item) => (item.id === id ? { ...item, isExpanded: !item.isExpanded } : item)))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((item, index) => (
        <div 
          key={item.id} 
          className="flex flex-col rounded-lg border border-border bg-surface-editor overflow-hidden"
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 h-9 border-b border-border bg-surface-active cursor-pointer group/header"
            onClick={() => toggleExpand(item.id)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[12px] font-bold text-white truncate">
                {item.name || `Input ${index + 1}`}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addItem()
                }}
                className="p-1.5 rounded hover:bg-surface-5 text-text-muted hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeItem(item.id)
                }}
                className="p-1.5 rounded hover:bg-surface-5 text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="p-1.5 text-text-muted transition-transform group-hover/header:text-white">
                {item.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* Content */}
          {item.isExpanded && (
            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    className="w-full bg-surface-editor border border-border rounded-md px-3 h-[32px] text-[13px] text-white outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-border placeholder:text-text-placeholder"
                    placeholder="firstName"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Type</label>
                  <CustomSelect
                    value={item.type}
                    options={TYPE_OPTIONS}
                    onChange={(val: any) => updateItem(item.id, { type: val })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  className="w-full bg-surface-editor border border-border rounded-md px-3 h-[32px] text-[13px] text-white outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-border placeholder:text-text-placeholder"
                  placeholder="Describe this field"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Default Value</label>
                <input
                  type="text"
                  value={item.defaultValue}
                  onChange={(e) => updateItem(item.id, { defaultValue: e.target.value })}
                  className="w-full bg-surface-editor border border-border rounded-md px-3 h-[32px] text-[13px] text-white outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-border placeholder:text-text-placeholder"
                  placeholder="Enter default value"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {value.length === 0 && (
        <button
          onClick={addItem}
          className="flex items-center justify-center gap-2 w-full h-[40px] rounded-lg border border-dashed border-border hover:border-border-strong hover:bg-surface-editor/50 text-[12px] font-medium text-text-muted hover:text-white transition-all group"
        >
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
          Add Input
        </button>
      )}
    </div>
  )
}

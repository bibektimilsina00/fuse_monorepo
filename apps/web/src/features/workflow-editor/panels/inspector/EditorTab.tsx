import React, { useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NODE_REGISTRY } from '@/nodes/registry'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'

import { CustomSelect } from '@/features/workflow-editor/panels/inspector/components/custom-select'
import { KeyValueField } from '@/features/workflow-editor/panels/inspector/components/key-value-field'
import { ConnectionsPanel } from '@/features/workflow-editor/panels/inspector/components/connections-panel'
import { ConditionListField } from '@/features/workflow-editor/panels/inspector/components/condition-list-field'
import { SchemaEditorField } from '@/features/workflow-editor/panels/inspector/components/schema-editor-field'
import { useNodeAncestors } from '@/features/workflow-editor/hooks/use-node-ancestors'
import { InterpolationPicker } from '@/features/workflow-editor/panels/inspector/components/interpolation-picker'

// Add custom Prism rules for interpolation
if (Prism.languages.json) {
  Prism.languages.json['interpolation'] = {
    pattern: /\{\{.*?\}\}/g,
    alias: 'important'
  }
}
if (Prism.languages.javascript) {
  Prism.languages.javascript['interpolation'] = {
    pattern: /\{\{.*?\}\}/g,
    alias: 'important'
  }
}

interface PropertyFieldProps {
  prop: any
  selectedNode: any
  handlePropertyChange: (name: string, value: any) => void
  onShowPicker: (rect: DOMRect, onSelect: (val: string) => void) => void
  isFirstClickAllowed: (subId?: string) => boolean
  onFirstClickUsed: (subId?: string) => void
}

const PropertyField: React.FC<PropertyFieldProps> = ({ 
  prop, 
  selectedNode, 
  handlePropertyChange,
  onShowPicker,
  isFirstClickAllowed,
  onFirstClickUsed
}) => {
  const propsData = selectedNode.data?.properties || {}
  const currentValue = propsData[prop.name] ?? prop.default ?? ''

  const handleInputInteraction = (e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if (isFirstClickAllowed()) {
      const input = e.target as HTMLInputElement
      const rect = input.getBoundingClientRect()
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const valueAtTrigger = input.value
      
      onShowPicker(rect, (val) => {
        const textBefore = valueAtTrigger.substring(0, start)
        const hasTrigger = textBefore.endsWith('{{')
        const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
        handlePropertyChange(prop.name, newVal)
      })
      onFirstClickUsed()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    // Show picker on {{
    if (e.key === '{' && input.value[input.selectionStart! - 1] === '{') {
      const rect = input.getBoundingClientRect()
      // Capture state after a tiny delay to ensure the second { is in the value
      setTimeout(() => {
        const start = input.selectionStart || 0
        const end = input.selectionEnd || 0
        const valueAtTrigger = input.value
        
        onShowPicker(rect, (val) => {
          const textBefore = valueAtTrigger.substring(0, start)
          const hasTrigger = textBefore.endsWith('{{')
          const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
          handlePropertyChange(prop.name, newVal)
        })
      }, 0)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] font-bold text-white">
          {prop.label}
          {prop.required && <span className="text-red-500 ml-1.5">*</span>}
        </label>
        {prop.type === 'json' && (
          <button className="h-[22px] px-2.5 rounded bg-[#333] hover:bg-[#444] text-[11px] font-medium text-white transition-colors">
            Generate
          </button>
        )}
      </div>

      {prop.type === 'string' && (
        <input
          type="text"
          value={currentValue}
          onFocus={handleInputInteraction}
          onClick={handleInputInteraction}
          onKeyDown={handleKeyDown}
          onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
          placeholder={prop.placeholder || `Enter ${prop.label}`}
          className="w-full bg-[#222] border border-[#333] rounded-md px-3 h-[36px] text-[13px] text-white placeholder:text-[#555] focus:outline-none"
        />
      )}

      {prop.type === 'number' && (
        <input
          type="number"
          value={currentValue}
          onFocus={handleInputInteraction}
          onClick={handleInputInteraction}
          onKeyDown={handleKeyDown}
          onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
          placeholder={prop.placeholder || `0`}
          className="w-full bg-[#222] border border-[#333] rounded-md px-3 h-[36px] text-[13px] text-white placeholder:text-[#555] focus:outline-none"
        />
      )}

      {prop.type === 'boolean' && (
        <div
          onClick={() => handlePropertyChange(prop.name, !propsData[prop.name])}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className={cn(
            "size-5 rounded border border-[#333] flex items-center justify-center transition-all",
            propsData[prop.name] ? "bg-[var(--brand-accent)] border-[var(--brand-accent)]" : "bg-[#222]"
          )}>
            {propsData[prop.name] && <div className="size-2 bg-white rounded-full" />}
          </div>
          <span className="text-[13px] text-white group-hover:text-[var(--brand-accent)] transition-colors">
            Enabled
          </span>
        </div>
      )}

      {prop.type === 'options' && (
        <CustomSelect
          value={currentValue}
          options={prop.options}
          onChange={(val: any) => handlePropertyChange(prop.name, val)}
          placeholder={prop.placeholder}
        />
      )}

      {prop.type === 'key-value' && (
        <KeyValueField
          value={propsData[prop.name] || prop.default || {}}
          onChange={(val: any) => handlePropertyChange(prop.name, val)}
          onShowPicker={onShowPicker}
          isFirstClickAllowed={isFirstClickAllowed}
          onFirstClickUsed={onFirstClickUsed}
        />
      )}

      {prop.type === 'list' && (
        <ConditionListField
          value={propsData[prop.name] || prop.default || []}
          onChange={(val: any) => handlePropertyChange(prop.name, val)}
          onShowPicker={onShowPicker}
          isFirstClickAllowed={isFirstClickAllowed}
          onFirstClickUsed={onFirstClickUsed}
        />
      )}

      {prop.type === 'schema' && (
        <SchemaEditorField
          value={propsData[prop.name] || prop.default || []}
          onChange={(val: any) => handlePropertyChange(prop.name, val)}
        />
      )}

      {prop.type === 'json' && (
        <div className="w-full bg-[#222] rounded-md overflow-hidden transition-all">
          <Editor
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue)}
            onValueChange={(code) => handlePropertyChange(prop.name, code)}
            highlight={code => Prism.highlight(code || '', Prism.languages.json, 'json')}
            padding={12}
            className="prism-editor min-h-[100px] focus:outline-none"
            textareaClassName="focus:outline-none"
            onFocus={(e: any) => {
              const target = e.target as HTMLTextAreaElement
              if (isFirstClickAllowed && isFirstClickAllowed()) {
                const rect = target.getBoundingClientRect()
                const start = target.selectionStart || 0
                const end = target.selectionEnd || 0
                const valueAtTrigger = target.value

                onShowPicker(rect, (val) => {
                  const textBefore = valueAtTrigger.substring(0, start)
                  const hasTrigger = textBefore.endsWith('{{')
                  const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
                  handlePropertyChange(prop.name, newVal)
                })
                onFirstClickUsed()
              }
            }}
            onClick={(e: any) => {
              const target = e.target as HTMLTextAreaElement
              if (isFirstClickAllowed && isFirstClickAllowed()) {
                const rect = target.getBoundingClientRect()
                const start = target.selectionStart || 0
                const end = target.selectionEnd || 0
                const valueAtTrigger = target.value

                onShowPicker(rect, (val) => {
                  const textBefore = valueAtTrigger.substring(0, start)
                  const hasTrigger = textBefore.endsWith('{{')
                  const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
                  handlePropertyChange(prop.name, newVal)
                })
                onFirstClickUsed()
              }
            }}
            onKeyDown={(e: any) => {
              const target = e.target as HTMLTextAreaElement
              if (e.key === '{' && target.value[target.selectionStart - 1] === '{') {
                const rect = target.getBoundingClientRect()
                setTimeout(() => {
                  const start = target.selectionStart || 0
                  const end = target.selectionEnd || 0
                  const valueAtTrigger = target.value

                  onShowPicker(rect, (val) => {
                    const textBefore = valueAtTrigger.substring(0, start)
                    const hasTrigger = textBefore.endsWith('{{')
                    const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
                    handlePropertyChange(prop.name, newVal)
                  })
                }, 0)
              }
            }}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 13,
            }}
          />
        </div>
      )}
    </div>
  )
}

export const EditorTab: React.FC = () => {
  const { nodes, edges, selectedNodeId, nodeSelectionTimestamp, updateNodeData } = useWorkflowStore()
  const [showAdditional, setShowAdditional] = useState(false)
  const [usedFields, setUsedFields] = useState<Set<string>>(new Set())
  const [picker, setPicker] = useState<{ rect: DOMRect, onSelect: (val: string) => void } | null>(null)

  React.useEffect(() => {
    setUsedFields(new Set())
    setPicker(null)
  }, [selectedNodeId, nodeSelectionTimestamp])

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const definition = selectedNode ? NODE_REGISTRY.find(d => d.type === selectedNode.type) : null

  const connectedNodes = useNodeAncestors(selectedNodeId, nodes, edges)

  if (!selectedNode || !definition) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <span className="text-[14px] text-[#666] font-medium leading-relaxed">
          Select a node on the canvas to configure its properties
        </span>
      </div>
    )
  }

  const handlePropertyChange = (name: string, value: any) => {
    updateNodeData(selectedNode.id, {
      properties: {
        ...(selectedNode.data?.properties || {}),
        [name]: value
      }
    })
  }

  const mainProps = definition.properties.filter(p => p.visibility !== 'hidden')
  const hiddenProps = definition.properties.filter(p => p.visibility === 'hidden')

  const isPropVisible = (prop: any) => {
    if (!prop.condition) return true
    const conditionPropDef = definition.properties.find(p => p.name === prop.condition!.field)
    const propsData = selectedNode.data?.properties || {}

    const conditionValue = propsData[prop.condition.field] ?? conditionPropDef?.default
    const expectedValue = prop.condition.value

    if (Array.isArray(expectedValue)) {
      return expectedValue.some(v => String(v).toUpperCase() === String(conditionValue).toUpperCase())
    }
    return String(expectedValue).toUpperCase() === String(conditionValue).toUpperCase()
  }

  const visibleMainProps = mainProps.filter(isPropVisible)
  const visibleHiddenProps = hiddenProps.filter(isPropVisible)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">
      {/* Properties Form - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-10">
        <div className="flex flex-col">
          {visibleMainProps.map((prop, index) => (
            <React.Fragment key={prop.name}>
              {index > 0 && (
                <div className="border-t border-dashed border-[#333] my-4" />
              )}
              <PropertyField
                prop={prop}
                selectedNode={selectedNode}
                handlePropertyChange={handlePropertyChange}
                onShowPicker={(rect, onSelect) => setPicker({ rect, onSelect })}
                isFirstClickAllowed={(subId) => !usedFields.has(subId || prop.name)}
                onFirstClickUsed={(subId) => setUsedFields(prev => new Set(prev).add(subId || prop.name))}
              />
            </React.Fragment>
          ))}

          {visibleHiddenProps.length > 0 && (
            <div className="mt-8 flex flex-col">
              <div
                onClick={() => setShowAdditional(!showAdditional)}
                className="flex items-center justify-center gap-3 cursor-pointer group mb-2"
              >
                <div className="flex-1 h-[1px] border-b border-dashed border-[#333]" />
                <span className="text-[12px] font-bold text-white flex items-center gap-1.5 hover:text-[var(--text-muted)] transition-colors">
                  Show additional fields
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showAdditional && "rotate-180")} />
                </span>
                <div className="flex-1 h-[1px] border-b border-dashed border-[#333]" />
              </div>

              {showAdditional && (
                <div className="flex flex-col mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {visibleHiddenProps.map((prop) => (
                    <PropertyField
                      key={prop.name}
                      prop={prop}
                      selectedNode={selectedNode}
                      handlePropertyChange={handlePropertyChange}
                      onShowPicker={(rect, onSelect) => setPicker({ rect, onSelect })}
                      isFirstClickAllowed={(subId) => !usedFields.has(subId || prop.name)}
                      onFirstClickUsed={(subId) => setUsedFields(prev => new Set(prev).add(subId || prop.name))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConnectionsPanel connectedNodes={connectedNodes} />

      {picker && (
        <InterpolationPicker 
          anchorRect={picker.rect}
          onSelect={(val) => {
            picker.onSelect(val)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

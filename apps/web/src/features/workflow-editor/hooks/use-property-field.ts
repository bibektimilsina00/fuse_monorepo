import React, { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api/client'
import { getDynamicLabel } from '@/features/workflow-editor/nodes/utils'

interface UsePropertyFieldProps {
  prop: any
  selectedNode: any
  handlePropertyChange: (name: string, value: any) => void
  onShowPicker: (rect: DOMRect, onSelect: (val: string) => void) => void
  onFirstClickUsed: (subId?: string) => void
  isFirstClickAllowed: (subId?: string) => boolean
}

export const usePropertyField = ({
  prop,
  selectedNode,
  handlePropertyChange,
  onShowPicker,
  onFirstClickUsed,
  isFirstClickAllowed
}: UsePropertyFieldProps) => {
  const propsData = selectedNode.data?.properties || {}
  const modes = propsData._modes || {}
  const mode = modes[prop.name] || (prop.loadOptions ? 'dynamic' : 'manual')
  
  const [dynamicOptions, setDynamicOptions] = useState<any[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  const dependencies = prop.loadOptionsDependsOn || []
  const dependencyValues = dependencies.map((d: string) => propsData[d]).join('|')

  const fetchOptions = useCallback(async () => {
    if (!prop.loadOptions) return
    
    setIsLoadingOptions(true)
    try {
      const params: Record<string, string> = {}
      dependencies.forEach((d: string) => {
        if (propsData[d]) params[d] = propsData[d]
      })
      
      const response = await apiClient.get(prop.loadOptions, { params })
      if (response.data.ok) {
        setDynamicOptions(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch options:', err)
    } finally {
      setIsLoadingOptions(false)
    }
  }, [prop.loadOptions, dependencyValues, propsData, dependencies])

  useEffect(() => {
    if (mode === 'dynamic' && prop.loadOptions) {
      fetchOptions()
    }
  }, [mode, prop.loadOptions, fetchOptions])

  const toggleMode = () => {
    const newMode = mode === 'manual' ? 'dynamic' : 'manual'
    handlePropertyChange('_modes', {
      ...modes,
      [prop.name]: newMode
    })
  }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && e.ctrlKey) {
      const input = e.target as HTMLInputElement
      const rect = input.getBoundingClientRect()
      onShowPicker(rect, (val) => {
        const start = input.selectionStart || 0
        const end = input.selectionEnd || 0
        const valueAtTrigger = input.value
        const newVal = valueAtTrigger.substring(0, start) + val + valueAtTrigger.substring(end)
        handlePropertyChange(prop.name, newVal)
      })
    }
  }

  return {
    mode,
    dynamicOptions,
    isLoadingOptions,
    currentValue,
    toggleMode,
    handleInputInteraction,
    handleKeyDown,
    getLabel: () => getDynamicLabel(prop, mode)
  }
}

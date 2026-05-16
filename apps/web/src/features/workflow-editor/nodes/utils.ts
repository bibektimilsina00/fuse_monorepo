/**
 * Formats a property value for a compact preview in the node UI.
 */
export const getPropValuePreview = (val: any, propType: string) => {
  if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return '-'
  if (propType === 'boolean') return val ? 'True' : 'False'
  if (propType === 'json' || propType === 'key-value') return '...'
  if (propType === 'schema' && Array.isArray(val)) return `${val.length} items`
  if (typeof val === 'string' && val.length > 10) return `${val.substring(0, 10)}...`
  return String(val)
}

/**
 * Checks if a property should be visible based on its conditions and the current node data.
 */
export const shouldShowProperty = (prop: any, properties: any, definition: any): boolean => {
  if (prop.visibility === 'hidden') return false
  if (!prop.condition) return true

  const checkCondition = (condition: any): boolean => {
    if (!condition) return true

    if (condition.any) {
      return condition.any.some((c: any) => checkCondition(c))
    }

    if (condition.all) {
      return condition.all.every((c: any) => checkCondition(c))
    }

    const { field, value: expectedValue } = condition
    const conditionPropDef = definition.properties.find((p: any) => p.name === field)
    const conditionValue = properties?.[field] ?? conditionPropDef?.default

    if (Array.isArray(expectedValue)) {
      return expectedValue.some(v => String(v).toUpperCase() === String(conditionValue).toUpperCase())
    }
    return String(expectedValue).toUpperCase() === String(conditionValue).toUpperCase()
  }

  return checkCondition(prop.condition)
}
/**
 * Gets a dynamic label for a property based on its configuration and current mode.
 */
export const getDynamicLabel = (prop: any, mode: 'manual' | 'dynamic' = 'manual') => {
  if (!prop.loadOptions) return prop.label
  const isChannel = prop.name === 'channel'
  const isUser = prop.name === 'user'
  
  if (mode === 'dynamic') {
    if (isChannel) return 'Select Channel'
    if (isUser) return 'Select User'
    return `Select ${prop.label.replace(' ID', '')}`
  }
  
  // Manual mode
  if (isChannel) return 'Channel ID'
  if (isUser) return 'User ID'
  return prop.label
}

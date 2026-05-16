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
export const shouldShowProperty = (prop: any, properties: any, definition: any) => {
  if (prop.visibility === 'hidden') return false
  if (!prop.condition) return true

  const { field, value: expectedValue } = prop.condition
  const conditionPropDef = definition.properties.find((p: any) => p.name === field)
  const conditionValue = properties?.[field] ?? conditionPropDef?.default

  if (Array.isArray(expectedValue)) {
    return expectedValue.some(v => String(v).toUpperCase() === String(conditionValue).toUpperCase())
  }
  return String(expectedValue).toUpperCase() === String(conditionValue).toUpperCase()
}

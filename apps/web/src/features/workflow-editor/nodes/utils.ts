export { shouldShowProperty } from '@/features/workflow-editor/panels/inspector/visibility'

/**
 * Formats a property value for a compact preview in the node UI.
 */
export const getPropValuePreview = (val: any, propType: string) => {
  if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return '-'
  if (propType === 'boolean') return val ? 'True' : 'False'
  if (propType === 'json' || propType === 'key-value') return '...'
  if ((propType === 'schema' || propType === 'list' || propType === 'file-list') && Array.isArray(val)) return `${val.length} items`
  if (typeof val === 'object') return '...'
  if (typeof val === 'string' && val.length > 10) return `${val.substring(0, 10)}...`
  return String(val)
}

/**
 * Gets a dynamic label for a property based on its configuration and current mode.
 */
export const getDynamicLabel = (prop: any, mode: 'manual' | 'dynamic' = 'manual') => {
  if (!prop.loadOptions) return prop.label
  if (mode === 'dynamic') return `Select ${prop.label.replace(/\s+ID$/i, '')}`
  return prop.label
}

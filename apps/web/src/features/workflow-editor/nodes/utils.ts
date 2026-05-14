/**
 * Formats a property value for a compact preview in the node UI.
 */
export const getPropValuePreview = (val: any, propType: string) => {
  if (val === undefined || val === null || val === '') return '-'
  if (propType === 'boolean') return val ? 'True' : 'False'
  if (propType === 'json' || propType === 'key-value') return '...'
  if (typeof val === 'string' && val.length > 10) return `${val.substring(0, 10)}...`
  return String(val)
}

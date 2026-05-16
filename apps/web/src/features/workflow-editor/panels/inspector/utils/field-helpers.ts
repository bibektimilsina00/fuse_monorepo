export const toEditorValue = (value: any, fallback: any): string => {
  const resolved = value ?? fallback ?? ''
  if (typeof resolved === 'string') return resolved
  return JSON.stringify(resolved, null, 2)
}

export const parseStructuredValue = (code: string): any => {
  if (!code.trim()) return ''
  try { return JSON.parse(code) } catch { return code }
}

export const toInputValue = (value: any): string | number => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export const insertInterpolation = (
  target: HTMLTextAreaElement | HTMLInputElement,
  onShowPicker: (rect: DOMRect, onSelect: (val: string) => void) => void,
  onSelectValue: (value: string) => void,
): void => {
  const rect = target.getBoundingClientRect()
  const start = target.selectionStart || 0
  const end = target.selectionEnd || 0
  const valueAtTrigger = target.value
  onShowPicker(rect, (val) => {
    const textBefore = valueAtTrigger.substring(0, start)
    const hasTrigger = textBefore.endsWith('{{')
    const newVal = (hasTrigger ? textBefore.slice(0, -2) : textBefore) + val + valueAtTrigger.substring(end)
    onSelectValue(newVal)
  })
}

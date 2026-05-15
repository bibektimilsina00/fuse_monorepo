// Vibrant palette for workflow icons
const WORKFLOW_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

// Local cache to avoid repeated localStorage hits during render
const colorCache: Record<string, string> = {}

/**
 * Gets a consistent color for a given ID based on persistent storage.
 */
export const getPersistentColorForId = (id: string) => {
  if (colorCache[id]) return colorCache[id]
  
  const mappingStr = localStorage.getItem('workflow-colors') || '{}';
  const mapping = JSON.parse(mappingStr);
  
  if (mapping[id] !== undefined) {
    const color = WORKFLOW_COLORS[mapping[id]]
    colorCache[id] = color
    return color
  }

  const lastIndex = parseInt(localStorage.getItem('workflow-color-index') || '-1', 10);
  const newIndex = (lastIndex + 1) % WORKFLOW_COLORS.length;
  mapping[id] = newIndex;
  
  localStorage.setItem('workflow-colors', JSON.stringify(mapping));
  localStorage.setItem('workflow-color-index', newIndex.toString());
  
  const color = WORKFLOW_COLORS[newIndex]
  colorCache[id] = color
  return color;
}

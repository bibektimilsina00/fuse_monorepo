import { useMemo } from 'react'
import { getToolsByCategory } from '@fuse/node-definitions'
import { useWorkflowStore } from '@/stores/workflow-store'
import type { ToolConfig } from '@fuse/node-definitions'

export interface AvailableTools {
  builtinTools: ToolConfig[]
  integrations: ToolConfig[]
  operationToolMap: Record<string, string>
}

const TOOL_CATEGORIES = new Set(['action', 'integration'])

export function useAvailableTools(): AvailableTools {
  // nodeDefinitions comes from the API via useNodes() — contains tools[] from Python NodeMetadata
  const nodeDefinitions = useWorkflowStore((s) => s.nodeDefinitions)

  return useMemo(() => {
    const availableToolIds = new Set<string>()
    const operationToolMap: Record<string, string> = {}

    for (const def of nodeDefinitions) {
      if (!def.tools || !TOOL_CATEGORIES.has(def.category)) continue
      for (const toolId of def.tools) {
        availableToolIds.add(toolId)
      }
      if (def.operationToolMap) {
        Object.assign(operationToolMap, def.operationToolMap)
      }
    }

    return {
      builtinTools: getToolsByCategory('builtin').filter((t) => availableToolIds.has(t.id)),
      integrations: getToolsByCategory('integration').filter((t) => availableToolIds.has(t.id)),
      operationToolMap,
    }
  }, [nodeDefinitions])
}

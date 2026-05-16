import { useMemo, useEffect } from 'react'
import { type NodeProps, useUpdateNodeInternals } from 'reactflow'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NodeToolbar } from '@/features/workflow-editor/nodes/components/node-toolbar'
import { NodeHeader } from '@/features/workflow-editor/nodes/components/node-header'
import { NodeProperty } from '@/features/workflow-editor/nodes/components/node-property'
import { NodeHandles } from '@/features/workflow-editor/nodes/components/node-handles'
import { getPropValuePreview } from '@/features/workflow-editor/nodes/utils'

export function CustomNode({ id, type, data, selected }: NodeProps) {
  const nodeDefinitions = useWorkflowStore(s => s.nodeDefinitions)
  const definition = useMemo(() => nodeDefinitions.find(d => d.type === type), [type, nodeDefinitions])
  const updateNodeInternals = useUpdateNodeInternals()
  const isLocked = data?.locked ?? false
  const handleDirection = data?.handleDirection ?? 'horizontal'

  useEffect(() => {
    updateNodeInternals(id)
    const t = setTimeout(() => updateNodeInternals(id), 50)
    return () => clearTimeout(t)
  }, [id, handleDirection, updateNodeInternals])
  
  if (!definition) return null

  const mainProps = definition.properties.filter(p => p.visibility !== 'hidden')
  const hasErrorHandle = !!definition.allowError

  return (
    <div className="group relative">
      <div 
        role="button" 
        tabIndex={0} 
        className={cn(
          "workflow-drag-handle relative z-[20] w-[200px] select-none rounded-lg border bg-[var(--surface-2)] transition-all",
          !isLocked ? "cursor-grab [&:active]:cursor-grabbing" : "cursor-default",
          selected && !isLocked ? "border-[var(--brand-accent)] shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "border-[#333]"
        )}
      >
        <NodeToolbar id={id} />
        <NodeHandles definition={definition} direction={handleDirection} />

        <NodeHeader 
          label={data.label || definition.name} 
          icon={definition.icon} 
          color={definition.color} 
        />

        {/* Properties list */}
        <div className="flex flex-col gap-1.5 py-2">
          {mainProps.map((prop) => (
            <NodeProperty 
              key={prop.name} 
              label={prop.label} 
              value={getPropValuePreview(data.properties?.[prop.name], prop.type)} 
            />
          ))}
          
          {hasErrorHandle && (
            <NodeProperty 
              label="error" 
              value="-" 
              handleId="error"
              handleClass="!bg-[#ff4d4f]"
            />
          )}
        </div>
      </div>
    </div>
  )
}



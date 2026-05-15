import { useMemo, useEffect } from 'react'
import { type NodeProps, useUpdateNodeInternals } from 'reactflow'
import { cn } from '@/lib/utils'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NodeToolbar } from '@/features/workflow-editor/nodes/components/node-toolbar'
import { NodeHeader } from '@/features/workflow-editor/nodes/components/node-header'
import { NodeProperty } from '@/features/workflow-editor/nodes/components/node-property'
import { NodeHandles } from '@/features/workflow-editor/nodes/components/node-handles'

export function ConditionNode({ id, type, data, selected }: NodeProps) {
  const definition = useMemo(() => NODE_REGISTRY.find(d => d.type === type), [type])
  const updateNodeInternals = useUpdateNodeInternals()
  const isLocked = data?.locked ?? false
  const handleDirection = data?.handleDirection ?? 'horizontal'

  useEffect(() => {
    updateNodeInternals(id)
    const t = setTimeout(() => updateNodeInternals(id), 50)
    return () => clearTimeout(t)
  }, [id, handleDirection, updateNodeInternals])
  
  if (!definition) return null

  const conditions = data.properties?.conditions || []
  const hasErrorHandle = !!definition.allowError
  
  // Total handles = condition rows + else row + (optional) error handle
  const totalOutputHandles = conditions.length + 1 + (hasErrorHandle ? 1 : 0)

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
        {/* Only render input handles, outputs are handled by rows */}
        <NodeHandles definition={definition} omitOutputs={true} direction={handleDirection} />

        <NodeHeader 
          label={data.label || definition.name} 
          icon={definition.icon} 
          color={definition.color} 
        />

        <div className="flex flex-col gap-1.5 py-2">
          {conditions.map((cond: any, i: number) => (
            <NodeProperty 
              key={cond.id || i}
              label={cond.label || (i === 0 ? 'If' : 'Else If')} 
              value={cond.expression || '-'}
              handleId={cond.id || `output-${i}`}
              direction={handleDirection}
              index={i}
              total={totalOutputHandles}
            />
          ))}
          
          <NodeProperty 
            label="Else" 
            value="-" 
            handleId="else"
            direction={handleDirection}
            index={conditions.length}
            total={totalOutputHandles}
          />
          
          {hasErrorHandle && (
            <NodeProperty 
              label="error" 
              value="-" 
              handleId="error"
              handleClass="!bg-[#ff4d4f]"
              direction={handleDirection}
              index={conditions.length + 1}
              total={totalOutputHandles}
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NodeToolbar } from '@/features/workflow-editor/nodes/components/node-toolbar'
import { NodeHeader } from '@/features/workflow-editor/nodes/components/node-header'
import { NodeProperty } from '@/features/workflow-editor/nodes/components/node-property'
import { NodeHandles } from '@/features/workflow-editor/nodes/components/node-handles'

export function ConditionNode({ id, type, data, selected }: NodeProps) {
  const { removeNode } = useWorkflowStore()
  const definition = useMemo(() => NODE_REGISTRY.find(d => d.type === type), [type])
  
  if (!definition) return null

  const conditions = data.properties?.conditions || []
  const hasErrorHandle = !!definition.allowError

  return (
    <div className="group relative">
      <div 
        role="button" 
        tabIndex={0} 
        className={cn(
          "workflow-drag-handle relative z-[20] w-[200px] cursor-grab select-none rounded-lg border bg-[var(--surface-2)] [&:active]:cursor-grabbing transition-colors",
          selected ? "border-[var(--brand-accent)]" : "border-[#333]"
        )}
      >
        <NodeToolbar id={id} onRemove={removeNode} />
        {/* Only render input handles, outputs are handled by rows */}
        <NodeHandles definition={definition} omitOutputs={true} />

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
            />
          ))}
          
          <NodeProperty 
            label="Else" 
            value="-" 
            handleId="else"
          />
          
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

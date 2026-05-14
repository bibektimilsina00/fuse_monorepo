import { Handle, Position } from 'reactflow'
import { cn } from '@/lib/utils'
import type { NodeDefinition } from '@/nodes/registry'

interface NodeHandlesProps {
  definition: NodeDefinition
  omitOutputs?: boolean
}

export const NodeHandles = ({ definition, omitOutputs }: NodeHandlesProps) => {
  const handleBaseClass = "react-flow__handle nodrag nopan !z-[50] !cursor-crosshair !border-none !transition-all !duration-150 !h-5 !w-[7px]"
  const inputHandleClass = cn(handleBaseClass, "!bg-[var(--workflow-edge,#555)] !left-[-8px] !rounded-l-[2px] !rounded-r-none hover:!left-[-11px] hover:!rounded-l-full hover:!w-[10px]")
  const outputHandleClass = cn(handleBaseClass, "!bg-[var(--workflow-edge,#555)] !right-[-8px] !rounded-r-[2px] !rounded-l-none hover:!right-[-11px] hover:!rounded-r-full hover:!w-[10px]")

  const outputCount = definition.outputs || 0

  return (
    <>
      {/* Input Handles */}
      {Array.from({ length: definition.inputs || 0 }).map((_, i) => (
        <Handle 
          key={`input-${i}`}
          type="target" 
          position={Position.Left} 
          id={`input-${i}`}
          className={inputHandleClass}
          style={{ 
            top: definition.inputs === 1 ? '22px' : `${22 + (i * 28)}px`, 
            transform: 'translateY(-50%)' 
          }} 
        />
      ))}

      {/* Output Handles */}
      {!omitOutputs && Array.from({ length: outputCount }).map((_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Right}
          id={`output-${i}`}
          className={outputHandleClass}
          style={{
            top: outputCount === 1 ? '22px' : `${22 + (i * 28)}px`,
            transform: 'translateY(-50%)'
          }}
        />
      ))}

    </>
  )
}

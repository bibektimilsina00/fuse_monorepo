import { Handle, Position } from 'reactflow'
import { cn } from '@/lib/utils'
import type { NodeDefinition } from '@/nodes/registry'

interface NodeHandlesProps {
  definition: NodeDefinition
  omitOutputs?: boolean
  direction?: 'vertical' | 'horizontal'
}

export const NodeHandles = ({ definition, omitOutputs, direction = 'horizontal' }: NodeHandlesProps) => {
  const isVertical = direction === 'vertical'
  
  const handleBaseClass = "react-flow__handle nodrag nopan !z-[50] !cursor-crosshair !border-none !transition-all !duration-150"
  
  // Horizontal Styles
  const hInputClass = cn(handleBaseClass, "!h-5 !w-[7px] !bg-[var(--workflow-edge,#555)] !left-[-8px] !rounded-l-[2px] !rounded-r-none hover:!left-[-11px] hover:!rounded-l-full hover:!w-[10px]")
  const hOutputClass = cn(handleBaseClass, "!h-5 !w-[7px] !bg-[var(--workflow-edge,#555)] !right-[-8px] !rounded-r-[2px] !rounded-l-none hover:!right-[-11px] hover:!rounded-r-full hover:!w-[10px]")
  
  // Vertical Styles
  const vInputClass = cn(handleBaseClass, "!w-5 !h-[7px] !bg-[var(--workflow-edge,#555)] !top-[-8px] !rounded-t-[2px] !rounded-b-none hover:!top-[-11px] hover:!rounded-t-full hover:!h-[10px]")
  const vOutputClass = cn(handleBaseClass, "!w-5 !h-[7px] !bg-[var(--workflow-edge,#555)] !bottom-[-8px] !rounded-b-[2px] !rounded-t-none hover:!bottom-[-11px] hover:!rounded-b-full hover:!h-[10px]")

  const inputCount = definition.inputs || 0
  const outputCount = definition.outputs || 0

  return (
    <>
      {/* Input Handles */}
      {Array.from({ length: inputCount }).map((_, i) => (
        <Handle
          key={`input-${i}-${direction}`}
          type="target"
          position={isVertical ? Position.Top : Position.Left}
          id={`input-${i}`}
          className={isVertical ? vInputClass : hInputClass}
          style={{ 
            ...(isVertical 
              ? { left: inputCount === 1 ? '50%' : `${(i + 1) * (100 / (inputCount + 1))}%`, transform: 'translateX(-50%)' }
              : { top: inputCount === 1 ? '20px' : `${20 + (i * 28)}px`, transform: 'translateY(-50%)' }
            )
          }} 
        />
      ))}

      {/* Output Handles */}
      {!omitOutputs && Array.from({ length: outputCount }).map((_, i) => (
        <Handle
          key={`output-${i}-${direction}`}
          type="source"
          position={isVertical ? Position.Bottom : Position.Right}
          id={`output-${i}`}
          className={isVertical ? vOutputClass : hOutputClass}
          style={{
            ...(isVertical 
              ? { left: outputCount === 1 ? '50%' : `${(i + 1) * (100 / (outputCount + 1))}%`, transform: 'translateX(-50%)' }
              : { top: outputCount === 1 ? '20px' : `${20 + (i * 28)}px`, transform: 'translateY(-50%)' }
            )
          }}
        />
      ))}
    </>
  )
}

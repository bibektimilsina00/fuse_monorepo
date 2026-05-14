import { Handle, Position } from 'reactflow'
import { cn } from '@/lib/utils'

interface NodePropertyProps {
  label: string
  value: string
  handleId?: string
  handleClass?: string
}

export const NodeProperty = ({ label, value, handleId, handleClass }: NodePropertyProps) => {
  const handleBaseClass = "react-flow__handle nodrag nopan !z-[50] !cursor-crosshair !border-none !transition-all !duration-150 !h-5 !w-[7px] !right-[-8px] !rounded-r-[2px] !rounded-l-none hover:!right-[-11px] hover:!rounded-r-full hover:!w-[10px]"

  return (
    <div className="relative flex items-center gap-2 px-3">
      <span className="min-w-0 truncate text-[var(--text-tertiary)] text-[12px] font-medium capitalize" title={label}>
        {label}
      </span>
      <span className="flex-1 truncate text-right text-[var(--text-primary)] text-[12px]" title={value}>
        {value}
      </span>
      
      {handleId && (
        <Handle 
          type="source" 
          position={Position.Right} 
          id={handleId}
          className={cn(handleBaseClass, handleClass || "!bg-[var(--workflow-edge,#555)]")}
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
      )}
    </div>
  )
}

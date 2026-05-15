import { Play, Square, Lock, Copy, ArrowLeftRight, ArrowUpDown, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflow-store'

interface NodeToolbarProps {
  id: string
}

export const NodeToolbar = ({ id }: NodeToolbarProps) => {
  const { 
    nodes, 
    removeNode, 
    toggleNodeLock, 
    duplicateNode, 
    toggleNodeHandleDirection 
  } = useWorkflowStore()

  const node = nodes.find(n => n.id === id)
  const isLocked = node?.data?.locked ?? false
  const isHorizontal = node?.data?.handleDirection === 'horizontal'

  const btnClass = "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-70 outline-none h-[24px] w-[24px] rounded-lg border border-[var(--border)] bg-[var(--surface-5)] text-[var(--text-secondary)] hover:border-transparent hover:bg-[var(--brand-accent)] hover:text-white dark:border-transparent dark:bg-[var(--surface-7)] dark:hover:bg-[var(--brand-accent)]"

  return (
    <div className="-top-[46px] pointer-events-auto absolute right-0 flex flex-row items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 gap-[5px] rounded-[10px] p-[5px] border border-[var(--border)] bg-[var(--surface-2)] dark:border-transparent dark:bg-[var(--surface-4)]">
      <Tooltip content="Run node">
        <button className={btnClass}><Play className="h-[11px] w-[11px]" /></button>
      </Tooltip>
      
      <Tooltip content="Stop node">
        <button className={btnClass}><Square className="h-[11px] w-[11px]" /></button>
      </Tooltip>

      <Tooltip content={isLocked ? "Unlock node" : "Lock node"}>
        <button 
          onClick={() => toggleNodeLock(id)} 
          className={cn(
            btnClass,
            isLocked && "bg-[#22c55e] text-white border-transparent hover:bg-[#16a34a] dark:bg-[#22c55e] dark:hover:bg-[#16a34a]"
          )}
        >
          <Lock className="h-[11px] w-[11px]" />
        </button>
      </Tooltip>

      <Tooltip content="Duplicate node">
        <button 
          onClick={() => duplicateNode(id)} 
          className={btnClass}
        >
          <Copy className="h-[11px] w-[11px]" />
        </button>
      </Tooltip>

      <Tooltip content={isHorizontal ? "Vertical handles" : "Horizontal handles"}>
        <button 
          onClick={() => toggleNodeHandleDirection(id)} 
          className={btnClass}
        >
          {isHorizontal ? (
            <ArrowUpDown className="h-[11px] w-[11px]" />
          ) : (
            <ArrowLeftRight className="h-[11px] w-[11px]" />
          )}
        </button>
      </Tooltip>

      <Tooltip content="Delete node">
        <button 
          onClick={() => removeNode(id)} 
          className={cn(btnClass, "hover:bg-red-500")}
        >
          <Trash2 className="h-[11px] w-[11px]" />
        </button>
      </Tooltip>
    </div>
  )
}

import { Play, Square, Lock, Copy, ArrowLeftRight, ArrowUpDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui'
import { useWorkflowStore } from '@/stores/workflow-store'

interface NodeToolbarProps {
  id: string
}

export const NodeToolbar = ({ id }: NodeToolbarProps) => {
  const { nodes, removeNode, toggleNodeLock, duplicateNode, toggleNodeHandleDirection } = useWorkflowStore()
  const node = nodes.find(n => n.id === id)
  const isLocked = node?.data?.locked ?? false
  const isHorizontal = node?.data?.handleDirection === 'horizontal'

  return (
    <div className="-top-[46px] pointer-events-auto absolute right-0 flex flex-row items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 gap-[5px] rounded-[10px] p-[5px] border border-[var(--border)] bg-[var(--surface-2)] dark:border-transparent dark:bg-[var(--surface-4)]">
      <IconButton icon={<Play className="h-[11px] w-[11px]" />} tooltip="Run node" size="xs" />
      <IconButton icon={<Square className="h-[11px] w-[11px]" />} tooltip="Stop node" size="xs" />

      <IconButton
        icon={<Lock className="h-[11px] w-[11px]" />}
        tooltip={isLocked ? 'Unlock node' : 'Lock node'}
        size="xs"
        onClick={() => toggleNodeLock(id)}
        className={cn(isLocked && 'bg-[#22c55e] text-white hover:bg-[#16a34a]')}
      />

      <IconButton
        icon={<Copy className="h-[11px] w-[11px]" />}
        tooltip="Duplicate node"
        size="xs"
        onClick={() => duplicateNode(id)}
      />

      <IconButton
        icon={isHorizontal
          ? <ArrowUpDown className="h-[11px] w-[11px]" />
          : <ArrowLeftRight className="h-[11px] w-[11px]" />}
        tooltip={isHorizontal ? 'Vertical handles' : 'Horizontal handles'}
        size="xs"
        onClick={() => toggleNodeHandleDirection(id)}
      />

      <IconButton
        icon={<Trash2 className="h-[11px] w-[11px]" />}
        tooltip="Delete node"
        size="xs"
        variant="danger"
        onClick={() => removeNode(id)}
      />
    </div>
  )
}

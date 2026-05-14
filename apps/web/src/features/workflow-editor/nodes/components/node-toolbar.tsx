import { Play, Square, Lock, Copy, ArrowLeftRight, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface NodeToolbarProps {
  id: string
  onRemove: (id: string) => void
}

export const NodeToolbar = ({ id, onRemove }: NodeToolbarProps) => {
  const btnClass = "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-70 outline-none h-[24px] w-[24px] rounded-lg border border-[var(--border)] bg-[var(--surface-5)] text-[var(--text-secondary)] hover:border-transparent hover:bg-[var(--brand-accent)] hover:text-white dark:border-transparent dark:bg-[var(--surface-7)] dark:hover:bg-[var(--brand-accent)]"

  return (
    <div className="-top-[46px] pointer-events-auto absolute right-0 flex flex-row items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 gap-[5px] rounded-[10px] p-[5px] border border-[var(--border)] bg-[var(--surface-2)] dark:border-transparent dark:bg-[var(--surface-4)]">
      <Tooltip content="Run node">
        <button className={btnClass}><Play className="h-[11px] w-[11px]" /></button>
      </Tooltip>
      
      <Tooltip content="Stop node">
        <button className={btnClass}><Square className="h-[11px] w-[11px]" /></button>
      </Tooltip>

      <Tooltip content="Lock node">
        <button className={btnClass}><Lock className="h-[11px] w-[11px]" /></button>
      </Tooltip>

      <Tooltip content="Duplicate node">
        <button className={btnClass}><Copy className="h-[11px] w-[11px]" /></button>
      </Tooltip>

      <Tooltip content="Replace node">
        <button className={btnClass}><ArrowLeftRight className="h-[11px] w-[11px]" /></button>
      </Tooltip>

      <Tooltip content="Delete node">
        <button onClick={() => onRemove(id)} className={btnClass}><Trash2 className="h-[11px] w-[11px]" /></button>
      </Tooltip>
    </div>
  )
}

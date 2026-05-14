import React, { useState } from 'react'
import { 
  Hand, 
  ChevronDown, 
  Undo2, 
  Redo2, 
  Maximize, 
  MousePointer2,
  Check
} from 'lucide-react'
import { useReactFlow } from 'reactflow'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

interface WorkflowControlsProps {
  mode: 'select' | 'pan'
  onModeChange: (mode: 'select' | 'pan') => void
}

export const WorkflowControls: React.FC<WorkflowControlsProps> = ({ 
  mode, 
  onModeChange 
}) => {
  const { fitView } = useReactFlow()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div 
      className="absolute bottom-4 left-4 z-[100] flex h-[36px] items-center gap-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-1 shadow-lg"
    >
      <Tooltip content={mode === 'select' ? "Select mode" : "Pan mode"}>
        <div className="relative">
          <div 
            className="flex items-center gap-1 px-1 cursor-pointer hover:bg-[var(--surface-hover)] rounded-md transition-colors h-[28px]"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center justify-center size-[24px] rounded-md bg-[var(--surface-active)] text-white border border-[var(--border-strong)]">
              {mode === 'select' ? (
                <MousePointer2 className="size-[12px]" strokeWidth={2.5} />
              ) : (
                <Hand className="size-[12px]" strokeWidth={2.5} />
              )}
            </div>
            <ChevronDown className={cn(
              "h-[8px] w-[10px] text-[var(--text-muted)] transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-[140px] rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] p-1 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={() => {
                  onModeChange('select')
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[12px] font-medium transition-all",
                  mode === 'select' ? "bg-[var(--surface-active)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <MousePointer2 className="size-[14px]" />
                  Select
                </div>
                {mode === 'select' && <Check className="size-[12px]" />}
              </button>
              <button
                onClick={() => {
                  onModeChange('pan')
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[12px] font-medium transition-all",
                  mode === 'pan' ? "bg-[var(--surface-active)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Hand className="size-[14px]" />
                  Pan
                </div>
                {mode === 'pan' && <Check className="size-[12px]" />}
              </button>
            </div>
          )}
        </div>
      </Tooltip>

      <div className="mx-1 h-[20px] w-[1px] bg-[var(--border-default)]" />

      <Tooltip content="Undo">
        <button 
          className="inline-flex items-center justify-center size-[28px] rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-all disabled:opacity-20"
        >
          <Undo2 className="size-[16px]" strokeWidth={1.5} />
        </button>
      </Tooltip>

      <Tooltip content="Redo" disabled>
        <button 
          className="inline-flex items-center justify-center size-[28px] rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-all disabled:opacity-20"
          disabled
        >
          <Redo2 className="size-[16px]" strokeWidth={1.5} />
        </button>
      </Tooltip>

      <div className="mx-1 h-[20px] w-[1px] bg-[var(--border-default)]" />

      <Tooltip content="Fit view">
        <button 
          onClick={() => fitView()}
          className="inline-flex items-center justify-center size-[28px] rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-all"
        >
          <Maximize className="size-[14px]" strokeWidth={2} />
        </button>
      </Tooltip>
    </div>
  )
}

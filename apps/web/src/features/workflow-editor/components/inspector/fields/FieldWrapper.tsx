import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { NodeProperty } from '../../../types/editorTypes'

interface FieldWrapperProps {
  prop: NodeProperty
  isExpression: boolean
  /** When omitted, the List/fx tabs are hidden (e.g. non-expression types). */
  onToggleExpression?: () => void
  /** When `canReset` + onReset are both set, renders a small reset chevron. */
  canReset?: boolean
  onReset?: () => void
  children: ReactNode
}

const NO_EXPRESSION_TYPES = new Set(['boolean', 'credential', 'collection', 'fixed-collection', 'tool-selector', 'skill-selector', 'messages'])

export function FieldWrapper({
  prop,
  isExpression,
  onToggleExpression,
  canReset,
  onReset,
  children,
}: FieldWrapperProps) {
  const supportsExpression = !!onToggleExpression && !NO_EXPRESSION_TYPES.has(prop.type)
  const isRequired = prop.required === true

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-text-mute leading-none">
          {prop.label}
          {isRequired && <span className="ml-1 text-err">*</span>}
        </label>
        <div className="flex items-center gap-1">
          {canReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset to default"
              className="h-[18px] shrink-0 rounded px-1 text-text-faint transition-colors hover:bg-surface hover:text-text-mute"
            >
              <RotateCcw className="h-[11px] w-[11px]" />
            </button>
          )}
          {supportsExpression && (
            <ModeTabs isExpression={isExpression} onChange={onToggleExpression!} />
          )}
        </div>
      </div>

      {children}

      {prop.description && (
        <p className="text-[11px] leading-relaxed text-text-faint">{prop.description}</p>
      )}
    </div>
  )
}

interface ModeTabsProps {
  isExpression: boolean
  onChange: () => void
}

/**
 * Two-tab toggle: List (renderer) on the left, fx (expression) on the right.
 * The active tab gets the surface fill, the inactive one stays muted.
 *
 * `onChange` is a flip — the parent already knows it's only ever two states,
 * so it doesn't need to receive the target mode.
 */
function ModeTabs({ isExpression, onChange }: ModeTabsProps) {
  const flipIfNeeded = (targetExpression: boolean) => {
    if (targetExpression !== isExpression) onChange()
  }
  return (
    <div
      role="tablist"
      aria-label="Field input mode"
      className="flex h-[18px] shrink-0 items-center gap-0 rounded-[5px] border border-border-faint bg-bg p-[1px]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isExpression}
        onClick={() => flipIfNeeded(false)}
        title="Pick from list"
        className={cn(
          'h-full rounded-[3px] px-1.5 text-[9.5px] font-semibold uppercase tracking-wide transition-colors',
          !isExpression
            ? 'bg-surface text-text'
            : 'text-text-faint hover:text-text-mute',
        )}
      >
        List
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isExpression}
        onClick={() => flipIfNeeded(true)}
        title="Use an expression like {{node.field}}"
        className={cn(
          'h-full rounded-[3px] px-1.5 font-mono text-[10px] italic transition-colors',
          isExpression
            ? 'bg-[var(--accent-line)]/15 text-[var(--accent)]'
            : 'text-text-faint hover:text-text-mute',
        )}
      >
        fx
      </button>
    </div>
  )
}

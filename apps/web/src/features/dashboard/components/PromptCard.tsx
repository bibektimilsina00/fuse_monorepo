import { useState, type KeyboardEvent } from 'react'
import { Mic, ArrowUp, Loader2, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useVoiceInput } from '@/shared/hooks/useVoiceInput'

interface PromptCardProps {
  onSubmit: (prompt: string) => void | Promise<void>
  busy?: boolean
  statusMessage?: string
  onCancel?: () => void
}

export function PromptCard({ onSubmit, busy = false, statusMessage, onCancel }: PromptCardProps) {
  const [prompt, setPrompt] = useState('')
  const voice = useVoiceInput({ value: prompt, onChange: setPrompt })

  const handleSend = () => {
    const text = prompt.trim()
    if (!text || busy) return
    void onSubmit(text)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(
        'group rounded-[14px] border bg-[var(--bg)] px-5 pt-4 pb-3 shadow-[0_1px_0_var(--border-faint),0_8px_24px_-12px_oklch(0_0_0/0.35)] transition-all duration-200',
        busy
          ? 'border-[var(--accent-line)] bg-[var(--accent-line)]/[0.04]'
          : 'border-[var(--border-faint)] focus-within:border-[var(--accent-line)] focus-within:shadow-[0_0_0_3px_var(--accent-line)/15,0_8px_24px_-12px_oklch(0_0_0/0.35)]',
      )}
    >
      {/* Input row */}
      <div className="flex items-start gap-2.5">
        <Sparkles
          className={cn(
            'mt-1 h-4 w-4 shrink-0 transition-colors',
            busy ? 'animate-pulse text-[var(--accent)]' : 'text-[var(--accent)]/70',
          )}
        />
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          rows={2}
          placeholder="Describe an automation. Copilot drafts the workflow, wires the nodes, and ships it to the canvas."
          className="min-h-[60px] w-full resize-none border-none bg-transparent text-[14.5px] leading-[1.55] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] disabled:opacity-70"
        />
      </div>

      {/* Footer — swaps to a status row while busy */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-faint)]/60 pt-2.5">
        {busy ? (
          <div className="flex w-full items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
            <span className="flex-1 text-[12.5px] text-[var(--text-mute)] transition-opacity duration-300">
              {statusMessage ?? 'Working…'}
            </span>
            {onCancel && (
              <button
                onClick={onCancel}
                title="Cancel"
                className="inline-flex h-7 items-center gap-1 rounded-[7px] px-2 text-[11.5px] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            )}
          </div>
        ) : (
          <>
            <span className="select-none text-[11px] text-[var(--text-faint)]">
              <kbd className="rounded border border-[var(--border-faint)] bg-[var(--surface)] px-1 py-px font-mono text-[10px]">↵</kbd> send ·{' '}
              <kbd className="rounded border border-[var(--border-faint)] bg-[var(--surface)] px-1 py-px font-mono text-[10px]">⇧↵</kbd> new line
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={voice.toggle}
                disabled={!voice.supported}
                title={
                  voice.supported
                    ? voice.listening
                      ? 'Stop dictation'
                      : 'Dictate'
                    : 'Voice not supported in this browser'
                }
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors',
                  voice.listening
                    ? 'animate-pulse bg-[var(--err)]/15 text-[var(--err)]'
                    : 'text-[var(--text-mute)] hover:bg-[var(--surface)] hover:text-[var(--text)]',
                  !voice.supported && 'cursor-not-allowed opacity-40',
                )}
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!prompt.trim()}
                title="Send to Copilot"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--text)] text-[var(--bg)] transition-all duration-150 hover:-translate-y-px hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

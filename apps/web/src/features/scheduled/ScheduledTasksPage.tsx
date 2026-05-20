import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Calendar, X, ChevronDown, Play, Pause } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import apiClient from '@/lib/api/client'
import { cn } from '@/lib/utils'

// Scheduled tasks = workflows that have a cron trigger node
const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_active: z.boolean().optional(),
  color: z.string().nullable().optional(),
  graph: z.any().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const FREQUENCIES = [
  { label: 'Minutely', value: '* * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily', value: '0 9 * * *' },
  { label: 'Weekly', value: '0 9 * * 1' },
  { label: 'Monthly', value: '0 9 1 * *' },
  { label: 'Custom (cron)', value: 'custom' },
]

const TIMES = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  const hStr = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return { label: `${hStr}:${m.toString().padStart(2, '0')} ${ampm}`, value: `${h}:${m.toString().padStart(2, '0')}` }
})

function getNextRun(cron: string): string {
  try {
    // Simple next-run text without a library
    return 'Next run calculated server-side'
  } catch { return '' }
}

// ── Create Modal ──────────────────────────────────────────────────────────────

const CreateModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('0 9 * * *')
  const [time, setTime] = useState('9:00')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [lifecycle, setLifecycle] = useState<'recurring' | 'runs'>('recurring')
  const [customCron, setCustomCron] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustom = frequency === 'custom'
  const finalCron = isCustom ? customCron : frequency

  // Compute next run display
  const now = new Date()
  const [h, m] = time.split(':').map(Number)
  now.setHours(h, m, 0, 0)
  const nextRunStr = `At ${TIMES.find(t => t.value === time)?.label ?? time} (${timezone.replace('/', '/')})`

  const submit = async () => {
    if (!title.trim()) return
    setLoading(true); setError(null)
    try {
      // Create a workflow with cron trigger node
      const wfRes = await apiClient.post('/workflows/', {
        name: title.trim(),
        description: description.trim() || null,
        graph: {
          nodes: [{
            id: `trigger.cron-${Date.now()}`,
            type: 'trigger.cron',
            position: { x: 100, y: 100 },
            data: {
              label: title.trim(),
              properties: {
                cron_expression: finalCron,
                timezone,
              },
            },
          }],
          edges: [],
        },
      })
      onCreated(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create task')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface-2)] border border-[var(--border-default)] rounded-xl w-full max-w-[520px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-white">Create new scheduled task</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Daily report generation"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Task description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this scheduled task should do…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] resize-none"
            />
          </div>

          {/* Run frequency */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Run frequency</label>
            <div className="relative">
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]">
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          {isCustom && (
            <div>
              <label className="text-[12px] font-medium text-white block mb-1.5">Cron expression</label>
              <input value={customCron} onChange={e => setCustomCron(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>
          )}

          {/* Time */}
          {!isCustom && (
            <div>
              <label className="text-[12px] font-medium text-white block mb-1.5">Time</label>
              <div className="relative">
                <select value={time} onChange={e => setTime(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]">
                  {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Timezone</label>
            <input value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>

          {/* Lifecycle */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Lifecycle</label>
            <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden w-fit">
              {(['recurring', 'runs'] as const).map(v => (
                <button key={v} onClick={() => setLifecycle(v)}
                  className={cn('px-3 py-1.5 text-[12px] font-medium capitalize transition-colors',
                    lifecycle === v ? 'bg-[var(--surface-active)] text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)]'
                  )}>
                  {v === 'runs' ? 'Number of runs' : 'Recurring'}
                </button>
              ))}
            </div>
          </div>

          {/* Next run preview */}
          {finalCron && (
            <div className="rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] px-4 py-3">
              <p className="text-[12px] text-white">{nextRunStr}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Next run: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, {TIMES.find(t => t.value === time)?.label ?? time}</p>
            </div>
          )}

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-default)] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-white transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-gray-100 transition-colors disabled:opacity-40">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const ScheduledTasksPage: React.FC = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const { data: allWorkflows = [], isLoading } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: () => requestJson(z.array(WorkflowSchema), { url: '/workflows/', method: 'GET' }),
    staleTime: 30_000,
  })

  // Scheduled tasks = workflows with a cron trigger node
  const tasks = allWorkflows.filter(wf => {
    const nodes = wf.graph?.nodes ?? []
    return nodes.some((n: any) => n.type === 'trigger.cron')
  })

  const filtered = search ? tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : tasks

  const getCron = (wf: any): string => {
    const nodes = wf.graph?.nodes ?? []
    const cronNode = nodes.find((n: any) => n.type === 'trigger.cron')
    return cronNode?.data?.properties?.cron_expression || ''
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-[15px] font-semibold text-white">Scheduled Tasks</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors">
          <Plus className="w-3.5 h-3.5" /> New scheduled task
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-2.5 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search scheduled tasks…"
            className="w-full pl-9 pr-4 py-1.5 bg-transparent text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-[2fr_1.5fr_100px_120px] px-6 py-2.5 border-b border-[var(--border-default)]">
          {['Task', 'Schedule', 'Status', 'Last Run'].map(h => (
            <span key={h} className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[46px] border-b border-[var(--border-default)] animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
            <p className="text-[13px] text-[var(--text-muted)]">{search ? 'No tasks match your search' : 'No scheduled tasks yet'}</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create a scheduled task
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map(task => (
              <div key={task.id} onClick={() => navigate(`/workflows/${task.id}`)}
                className="grid grid-cols-[2fr_1.5fr_100px_120px] px-6 py-3 border-b border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer items-center">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: task.color || '#6366f1' }} />
                  <span className="text-[13px] text-white truncate font-medium">{task.name}</span>
                </div>
                <span className="text-[12px] text-[var(--text-muted)] font-mono">{getCron(task) || '—'}</span>
                <div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium',
                    task.is_active !== false ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-[var(--surface-3)] border border-[var(--border-default)] text-[var(--text-muted)]'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', task.is_active !== false ? 'bg-green-400' : 'bg-[var(--text-muted)]')} />
                    {task.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">{new Date(task.updated_at).toLocaleDateString()}</span>
              </div>
            ))}
            <div onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 text-[13px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> New scheduled task
            </div>
          </>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['scheduled-tasks'] })} />}
    </div>
  )
}

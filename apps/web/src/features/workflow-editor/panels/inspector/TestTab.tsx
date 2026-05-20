import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import apiClient from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface TestResult {
  success: boolean
  output: any
  error: string | null
  logs: string[]
  duration_ms: number
}

const JsonViewer: React.FC<{ data: any; label: string; defaultOpen?: boolean }> = ({ data, label, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  if (data == null || (typeof data === 'object' && Object.keys(data).length === 0 && !Array.isArray(data))) return null
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5 hover:text-white transition-colors">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && (
        <pre className="bg-[var(--surface-3)] border border-[var(--border-default)] rounded-lg p-3 text-[11px] text-white font-mono overflow-x-auto leading-relaxed max-h-64 custom-scrollbar">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export const TestTab: React.FC = () => {
  const { id: workflowId } = useParams<{ id: string }>()
  const { nodes, selectedNodeId, nodeDefinitions } = useWorkflowStore()

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const definition = selectedNode ? nodeDefinitions.find(d => d.type === selectedNode.type) : null

  const [inputJson, setInputJson] = useState('{}')
  const [inputError, setInputError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const validateJson = (val: string) => {
    try { JSON.parse(val); setInputError(null); return true }
    catch (e: any) { setInputError(e.message); return false }
  }

  const handleRun = async () => {
    if (!selectedNode || !definition) return
    if (!validateJson(inputJson)) return

    setRunning(true)
    setResult(null)
    try {
      const res = await apiClient.post('/nodes/test', {
        node_type: selectedNode.type,
        properties: selectedNode.data?.properties || {},
        input_data: JSON.parse(inputJson),
        workflow_id: workflowId,
      })
      setResult(res.data)
    } catch (e: any) {
      setResult({
        success: false,
        output: null,
        error: e?.response?.data?.detail || e.message || 'Request failed',
        logs: [],
        duration_ms: 0,
      })
    } finally {
      setRunning(false)
    }
  }

  if (!selectedNode || !definition) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <span className="text-[13px] text-[var(--text-muted)]">Select a node to test it</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">

        {/* Node info */}
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-default)]">
          <div className="flex size-6 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: definition.color || '#3b82f6' }}>
            <span className="text-[10px] text-white font-bold">{definition.name[0]}</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">{selectedNode.data?.label || definition.name}</p>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">{definition.type}</p>
          </div>
        </div>

        {/* Current properties preview */}
        <JsonViewer data={selectedNode.data?.properties} label="Current Properties" defaultOpen={false} />

        {/* Input JSON */}
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1.5">
            Input Data
          </label>
          <textarea
            value={inputJson}
            onChange={e => { setInputJson(e.target.value); validateJson(e.target.value) }}
            rows={8}
            spellCheck={false}
            className={cn(
              'w-full bg-[var(--surface-3)] border rounded-lg p-3 text-[12px] text-white font-mono focus:outline-none resize-none leading-relaxed custom-scrollbar',
              inputError ? 'border-red-500/50' : 'border-[var(--border-default)] focus:border-[var(--border-focus)]'
            )}
            placeholder={'{\n  "key": "value"\n}'}
          />
          {inputError && <p className="text-[11px] text-red-400 mt-1">{inputError}</p>}
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={running || !!inputError}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] font-medium text-white hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40"
        >
          {running
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
            : <><Play className="w-3.5 h-3.5 fill-current" /> Run Node</>
          }
        </button>

        {/* Result */}
        {result && (
          <div className={cn('rounded-xl border p-3 flex flex-col gap-3', result.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}>
            {/* Status header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />
                }
                <span className={cn('text-[13px] font-semibold', result.success ? 'text-green-400' : 'text-red-400')}>
                  {result.success ? 'Success' : 'Failed'}
                </span>
              </div>
              {result.duration_ms > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-mono">
                  <Clock className="w-3 h-3" />{result.duration_ms}ms
                </span>
              )}
            </div>

            {/* Error */}
            {result.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                <p className="text-[12px] text-red-300 font-mono leading-relaxed">{result.error}</p>
              </div>
            )}

            {/* Output */}
            <JsonViewer data={result.output} label="Output" defaultOpen />

            {/* Logs */}
            {result.logs && result.logs.length > 0 && (
              <JsonViewer data={result.logs} label={`Logs (${result.logs.length})`} defaultOpen={false} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

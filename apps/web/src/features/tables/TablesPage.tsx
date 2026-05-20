import React, { useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Download, Upload, Filter, ArrowUpDown, Table, ChevronDown,
  Trash2, X, Type, Hash, Calendar, ToggleLeft, List, Link, Mail,
  AlignLeft, Phone, Check,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import apiClient from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'

// ── Schemas ──────────────────────────────────────────────────────────────────

const TableSchema = z.object({ id: z.string(), name: z.string(), description: z.string().nullable().optional(), created_at: z.string() })
const ColumnSchema = z.object({ id: z.string(), name: z.string(), col_type: z.string(), position: z.number(), options: z.any().optional() })
const RowSchema = z.object({ id: z.string(), data: z.record(z.any()), position: z.number() })
const TableDataSchema = z.object({ columns: z.array(ColumnSchema), rows: z.array(RowSchema) })

type DBTable = z.infer<typeof TableSchema>
type Column = z.infer<typeof ColumnSchema>
type Row = z.infer<typeof RowSchema>

// ── Column types ──────────────────────────────────────────────────────────────

interface ColTypeDef {
  type: string
  label: string
  icon: React.FC<any>
  description: string
}

const COL_TYPES: ColTypeDef[] = [
  { type: 'text',     label: 'Text',      icon: Type,        description: 'Single or multi-line text' },
  { type: 'number',   label: 'Number',    icon: Hash,        description: 'Integer or decimal values' },
  { type: 'boolean',  label: 'Checkbox',  icon: Check,       description: 'True / false toggle' },
  { type: 'date',     label: 'Date',      icon: Calendar,    description: 'Date and optional time' },
  { type: 'select',   label: 'Select',    icon: List,        description: 'Single choice from options' },
  { type: 'url',      label: 'URL',       icon: Link,        description: 'Web link' },
  { type: 'email',    label: 'Email',     icon: Mail,        description: 'Email address' },
  { type: 'phone',    label: 'Phone',     icon: Phone,       description: 'Phone number' },
  { type: 'textarea', label: 'Long text', icon: AlignLeft,   description: 'Multi-line text area' },
]

const COL_ICONS: Record<string, React.FC<any>> = Object.fromEntries(COL_TYPES.map(t => [t.type, t.icon]))

// ── Column Panel (right-side drawer) ─────────────────────────────────────────

interface ColumnPanelProps {
  tableId: string
  editingColumn?: Column | null   // null = new column
  onClose: () => void
  onSaved: () => void
}

const ColumnPanel: React.FC<ColumnPanelProps> = ({ tableId, editingColumn, onClose, onSaved }) => {
  const workspaceId = useWorkspaceStore(s => s.currentWorkspaceId)
  const qc = useQueryClient()

  const [name, setName] = useState(editingColumn?.name ?? '')
  const [colType, setColType] = useState(editingColumn?.col_type ?? 'text')
  const [required, setRequired] = useState(false)
  const [defaultVal, setDefaultVal] = useState('')
  const [selectChoices, setSelectChoices] = useState<string[]>(
    editingColumn?.options?.choices ?? []
  )
  const [newChoice, setNewChoice] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedTypeDef = COL_TYPES.find(t => t.type === colType) ?? COL_TYPES[0]

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const options = colType === 'select' ? { choices: selectChoices } : undefined
      if (editingColumn) {
        await apiClient.patch(`/tables/${tableId}/columns/${editingColumn.id}`, {
          name: name.trim(), col_type: colType, options,
        })
      } else {
        await apiClient.post(`/tables/${tableId}/columns`, {
          name: name.trim(), col_type: colType, options,
        })
      }
      qc.invalidateQueries({ queryKey: ['table-rows', tableId, workspaceId] })
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-[var(--border-default)] bg-[var(--surface-2)] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-default)]">
        <h3 className="text-[13px] font-semibold text-white">
          {editingColumn ? 'Edit column' : 'New column'}
        </h3>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">Column Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Column name"
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
          />
        </div>

        {/* Data type */}
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">Data Type</label>
          <div className="flex flex-col gap-1">
            {COL_TYPES.map(t => {
              const Icon = t.icon
              const active = colType === t.type
              return (
                <button
                  key={t.type}
                  onClick={() => setColType(t.type)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-colors',
                    active
                      ? 'bg-[var(--surface-3)] border border-[var(--border-focus)] text-white'
                      : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)] border border-transparent'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-white' : '')} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-none">{t.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.description}</p>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Select choices */}
        {colType === 'select' && (
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">Options</label>
            <div className="flex flex-col gap-1 mb-2">
              {selectChoices.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] group">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="flex-1 text-[12px] text-white">{c}</span>
                  <button
                    onClick={() => setSelectChoices(prev => prev.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newChoice}
                onChange={e => setNewChoice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newChoice.trim()) {
                    setSelectChoices(prev => [...prev, newChoice.trim()])
                    setNewChoice('')
                  }
                }}
                placeholder="Add option…"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[12px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              />
              <button
                onClick={() => { if (newChoice.trim()) { setSelectChoices(prev => [...prev, newChoice.trim()]); setNewChoice('') } }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Constraints */}
        <div>
          <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">Constraints</label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setRequired(v => !v)}
              className={cn(
                'w-8 h-4 rounded-full transition-colors relative cursor-pointer',
                required ? 'bg-indigo-600' : 'bg-[var(--surface-3)] border border-[var(--border-default)]'
              )}
            >
              <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform', required ? 'translate-x-4' : 'translate-x-0.5')} />
            </div>
            <span className="text-[12px] text-[var(--text-muted)]">Required</span>
          </label>
        </div>

        {/* Default value */}
        {colType !== 'boolean' && colType !== 'select' && (
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-2">Default Value</label>
            <input
              value={defaultVal}
              onChange={e => setDefaultVal(e.target.value)}
              placeholder="Leave empty for none"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-[var(--border-default)]">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="flex-1 py-2 rounded-lg bg-white text-black text-[12px] font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : editingColumn ? 'Save changes' : 'Add column'}
        </button>
      </div>
    </div>
  )
}

// ── Cell component ────────────────────────────────────────────────────────────

const Cell: React.FC<{
  value: any; col: Column; rowId: string; onSave: (rowId: string, colId: string, val: any) => void
}> = ({ value, col, rowId, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))

  const commit = () => {
    onSave(rowId, col.id, col.col_type === 'number' ? Number(draft) : draft)
    setEditing(false)
  }

  if (col.col_type === 'boolean') {
    return (
      <div className="w-full h-full flex items-center px-3">
        <input type="checkbox" checked={!!value} onChange={e => onSave(rowId, col.id, e.target.checked)}
          className="w-3.5 h-3.5 cursor-pointer" />
      </div>
    )
  }

  if (editing) {
    return (
      <input
        autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full h-full px-3 py-2 bg-[var(--surface-3)] text-[13px] text-white focus:outline-none border border-indigo-500/50"
      />
    )
  }
  return (
    <div className="w-full h-full px-3 py-2 text-[13px] text-white truncate cursor-text" onDoubleClick={() => setEditing(true)}>
      {value !== undefined && value !== null && value !== '' ? String(value) : ''}
    </div>
  )
}

// ── Table View ────────────────────────────────────────────────────────────────

const TableView: React.FC<{ tableId: string; tableName: string }> = ({ tableId, tableName }) => {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const workspaceId = useWorkspaceStore(s => s.currentWorkspaceId)
  const [columnPanel, setColumnPanel] = useState<{ open: boolean; editing?: Column | null }>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['table-rows', tableId, workspaceId],
    queryFn: () => requestJson(TableDataSchema, { url: `/tables/${tableId}/rows`, method: 'GET' }),
    enabled: !!tableId && !!workspaceId,
    staleTime: 5_000,
  })

  const { columns = [], rows = [] } = data ?? {}

  const addRow = useMutation({
    mutationFn: () => apiClient.post(`/tables/${tableId}/rows`, { data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-rows', tableId, workspaceId] }),
  })

  const updateRow = useMutation({
    mutationFn: ({ rowId, colId, val }: { rowId: string; colId: string; val: any }) =>
      apiClient.patch(`/tables/${tableId}/rows/${rowId}`, { data: { [colId]: val } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-rows', tableId, workspaceId] }),
  })

  const deleteRow = useMutation({
    mutationFn: (rowId: string) => apiClient.delete(`/tables/${tableId}/rows/${rowId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-rows', tableId, workspaceId] }),
  })

  const importCSV = async (file: File) => {
    const form = new FormData(); form.append('file', file)
    await apiClient.post(`/tables/${tableId}/import.csv`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    qc.invalidateQueries({ queryKey: ['table-rows', tableId, workspaceId] })
  }

  const exportCSV = () => window.open(`/api/v1/tables/${tableId}/export.csv`, '_blank')

  const onSave = useCallback((rowId: string, colId: string, val: any) => {
    updateRow.mutate({ rowId, colId, val })
  }, [updateRow])

  const COL_W = 180
  const openNewColumn = () => setColumnPanel({ open: true, editing: null })
  const openEditColumn = (col: Column) => setColumnPanel({ open: true, editing: col })

  return (
    <div className="h-full flex overflow-hidden bg-[var(--bg)]">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] rounded-md transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] rounded-md transition-colors">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && importCSV(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] rounded-md transition-colors">
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] rounded-md transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={openNewColumn}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] transition-colors',
                columnPanel.open && !columnPanel.editing
                  ? 'border-[var(--border-focus)] text-white bg-[var(--surface-3)]'
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)]'
              )}
            >
              <Plus className="w-3.5 h-3.5" /> New column
            </button>
          </div>
        </div>

        {/* Spreadsheet */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-8 text-[13px] text-[var(--text-muted)]">Loading…</div>
          ) : (
            <table className="border-collapse" style={{ minWidth: (columns.length + 1) * COL_W + 48 }}>
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-2)]">
                  <th className="w-12 px-3 py-2.5 border-r border-[var(--border-default)]">
                    <input type="checkbox" className="opacity-0" />
                  </th>
                  {columns.map(col => {
                    const Icon = COL_ICONS[col.col_type] ?? Type
                    return (
                      <th
                        key={col.id}
                        className="border-r border-[var(--border-default)] text-left cursor-pointer hover:bg-[var(--surface-3)] transition-colors"
                        style={{ width: COL_W, minWidth: COL_W }}
                        onClick={() => openEditColumn(col)}
                      >
                        <div className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          {col.name}
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-3 py-2.5" style={{ width: COL_W }}>
                    <button onClick={openNewColumn} className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" /> New column
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b border-[var(--border-default)] hover:bg-[var(--surface-2)] group transition-colors" style={{ height: 36 }}>
                    <td className="w-12 px-3 border-r border-[var(--border-default)] text-[11px] text-[var(--text-muted)] text-center">
                      <span className="group-hover:hidden">{i + 1}</span>
                      <button onClick={() => deleteRow.mutate(row.id)} className="hidden group-hover:block text-[var(--text-muted)] hover:text-red-400 mx-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                    {columns.map(col => (
                      <td key={col.id} className="border-r border-[var(--border-default)] p-0" style={{ width: COL_W, height: 36 }}>
                        <Cell value={row.data[col.id]} col={col} rowId={row.id} onSave={onSave} />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-2">
                    <button onClick={() => addRow.mutate()} className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" /> New row
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Column config panel */}
      {columnPanel.open && (
        <ColumnPanel
          tableId={tableId}
          editingColumn={columnPanel.editing}
          onClose={() => setColumnPanel({ open: false })}
          onSaved={() => setColumnPanel({ open: false })}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const TablesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = useWorkspaceStore(s => s.currentWorkspaceId)
  const qc = useQueryClient()
  const activeTableId = searchParams.get('table')

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', workspaceId],
    queryFn: () => requestJson(z.array(TableSchema), { url: '/tables/', method: 'GET' }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  })

  const createTable = useMutation({
    mutationFn: (name: string) => requestJson(TableSchema, { url: '/tables/', method: 'POST', data: { name } }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tables', workspaceId] })
      setSearchParams({ table: t.id })
    },
  })

  const activeTable = tables.find(t => t.id === activeTableId)

  return (
    <div className="h-full flex overflow-hidden bg-[var(--bg)]">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0 border-r border-[var(--border-default)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-default)]">
          <span className="text-[12px] font-semibold text-white">Tables</span>
          <button onClick={() => { const n = prompt('Table name'); if (n?.trim()) createTable.mutate(n.trim()) }}
            className="text-[var(--text-muted)] hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
          {tables.length === 0 ? (
            <button onClick={() => createTable.mutate('My Table')}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors text-left">
              <Plus className="w-3.5 h-3.5" /> New table
            </button>
          ) : (
            tables.map(t => (
              <button key={t.id} onClick={() => setSearchParams({ table: t.id })}
                className={cn('flex items-center gap-2 w-full px-3 py-2 text-[12px] transition-colors text-left',
                  t.id === activeTableId ? 'bg-[var(--surface-3)] text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)]'
                )}>
                <Table className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTable ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-default)] flex-shrink-0">
              <span className="text-[13px] text-[var(--text-muted)]">Tables</span>
              <span className="text-[var(--text-muted)]">/</span>
              <span className="text-[13px] font-medium text-white">{activeTable.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </div>
            <TableView tableId={activeTable.id} tableName={activeTable.name} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Table className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
            <p className="text-[14px] text-white font-medium mb-1">No table selected</p>
            <p className="text-[13px] text-[var(--text-muted)] mb-4">
              {tables.length === 0 ? 'Create your first table to get started' : 'Select a table from the sidebar'}
            </p>
            {tables.length === 0 && (
              <button onClick={() => createTable.mutate('My Table')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[13px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors">
                <Plus className="w-3.5 h-3.5" /> New table
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

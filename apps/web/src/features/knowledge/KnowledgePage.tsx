import React, { useState, useRef } from 'react'
import { Plus, Search, Upload, FileText, Trash2, MoreHorizontal, Database, X, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import apiClient from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'

// ── Schemas ──────────────────────────────────────────────────────────────────

const KBSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  embedding_model: z.string(),
  embedding_credential_id: z.string().nullable().optional(),
  chunk_size: z.number().optional().default(1000),
  chunk_overlap: z.number().optional().default(200),
  document_count: z.number().optional().default(0),
  created_at: z.string(),
})
type KB = z.infer<typeof KBSchema>

const DocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  source_type: z.string(),
  chunk_count: z.number(),
  created_at: z.string(),
})
type KBDocument = z.infer<typeof DocumentSchema>

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useKBs() {
  const workspaceId = useWorkspaceStore(s => s.currentWorkspaceId)
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['kb', workspaceId],
    queryFn: () => requestJson(z.array(KBSchema), { url: '/kb/', method: 'GET' }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
  return { ...query, invalidate: () => qc.invalidateQueries({ queryKey: ['kb', workspaceId] }) }
}

function useKBDocuments(kbId: string | null) {
  return useQuery({
    queryKey: ['kb', kbId, 'docs'],
    queryFn: async () => {
      if (!kbId) return []
      const data = await apiClient.get(`/kb/${kbId}`)
      return z.array(DocumentSchema).parse(data.data.documents || [])
    },
    enabled: !!kbId,
    staleTime: 10_000,
  })
}

// ── Create KB Modal ───────────────────────────────────────────────────────────

interface CreateKBModalProps { onClose: () => void; onCreated: () => void }

const CHUNK_STRATEGIES = [
  { label: 'Fixed size (characters)', value: 'fixed' },
  { label: 'Recursive (smart split)', value: 'recursive' },
  { label: 'Sentence-aware', value: 'sentence' },
]

const CreateKBModal: React.FC<CreateKBModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [credentialId, setCredentialId] = useState('')
  const [model, setModel] = useState('text-embedding-3-small')
  const [chunkSize, setChunkSize] = useState(1000)
  const [chunkOverlap, setChunkOverlap] = useState(200)
  const [strategy, setStrategy] = useState('fixed')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await apiClient.post('/kb/', {
        name: name.trim(),
        description: description.trim() || null,
        embedding_model: model,
        embedding_credential_id: credentialId.trim() || null,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      })
      const kbId = res.data.id
      // Upload any attached files
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        await apiClient.post(`/kb/${kbId}/documents/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      onCreated(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create knowledge base')
    } finally { setLoading(false) }
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface-2)] border border-[var(--border-default)] rounded-xl w-full max-w-[560px] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-white">Create Knowledge Base</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Name</label>
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter knowledge base name"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe this knowledge base (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] resize-none"
            />
          </div>

          {/* Chunk Size + Overlap */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-white block mb-1.5">Chunk Size (characters)</label>
              <input
                type="number" value={chunkSize} onChange={e => setChunkSize(Number(e.target.value))}
                min={100} max={8000}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-white block mb-1.5">Overlap (characters)</label>
              <input
                type="number" value={chunkOverlap} onChange={e => setChunkOverlap(Number(e.target.value))}
                min={0} max={chunkSize / 2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] -mt-2">Overlap keeps context between chunks to avoid cutting sentences.</p>

          {/* Chunking Strategy */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Chunking Strategy</label>
            <div className="relative">
              <select
                value={strategy} onChange={e => setStrategy(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white focus:outline-none focus:border-[var(--border-focus)]"
              >
                {CHUNK_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {strategy === 'fixed' && 'Splits text at exact character count. Fast and predictable.'}
              {strategy === 'recursive' && 'Tries to split on paragraphs, then sentences, then characters.'}
              {strategy === 'sentence' && 'Splits on sentence boundaries for natural chunks.'}
            </p>
          </div>

          {/* Embedding credential */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">OpenAI Credential ID</label>
            <input
              value={credentialId} onChange={e => setCredentialId(e.target.value)}
              placeholder="Paste your OpenAI credential ID (from Settings → API Keys)"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
          </div>

          {/* Upload Documents */}
          <div>
            <label className="text-[12px] font-medium text-white block mb-1.5">Upload Documents</label>
            <div
              className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--border-focus)] transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            >
              <Upload className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[12px] text-[var(--text-muted)]">Drop files here or click to browse</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">PDF, TXT, MD, CSV, HTML, JSON (max 100MB each)</p>
            </div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,.csv,.html,.json" className="hidden" onChange={e => addFiles(e.target.files)} />
            {files.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--surface-3)] text-[12px] text-white">
                    <span className="truncate flex-1">{f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-2 text-[var(--text-muted)] hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-default)] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[var(--text-muted)] hover:text-white transition-colors">Cancel</button>
          <button
            onClick={submit} disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KB Detail Panel ───────────────────────────────────────────────────────────

const KBDetail: React.FC<{ kb: KB; onBack: () => void; onDeleted: () => void }> = ({ kb, onBack, onDeleted }) => {
  const { data: docs = [], isLoading, refetch } = useKBDocuments(kb.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [textName, setTextName] = useState('')
  const [textContent, setTextContent] = useState('')
  const [showAddText, setShowAddText] = useState(false)
  const [addingText, setAddingText] = useState(false)

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData(); form.append('file', file)
      await apiClient.post(`/kb/${kb.id}/documents/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      refetch()
    } catch (e: any) { alert(e?.response?.data?.detail || 'Upload failed') }
    finally { setUploading(false) }
  }

  const addText = async () => {
    if (!textName.trim() || !textContent.trim()) return
    setAddingText(true)
    try {
      await apiClient.post(`/kb/${kb.id}/documents/text`, { name: textName.trim(), text: textContent.trim() })
      setTextName(''); setTextContent(''); setShowAddText(false); refetch()
    } catch (e: any) { alert(e?.response?.data?.detail || 'Failed') }
    finally { setAddingText(false) }
  }

  const deleteDoc = async (docId: string) => {
    await apiClient.delete(`/kb/${kb.id}/documents/${docId}`); refetch()
  }

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await apiClient.post(`/kb/${kb.id}/search`, { query, top_k: 5 })
      setResults(res.data.results || [])
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[var(--text-muted)] hover:text-white transition-colors text-[13px]">Knowledge Base</button>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-white text-[13px] font-medium">{kb.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.csv,.html,.json" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <button
            onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button
            onClick={() => setShowAddText(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add text
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Add text form */}
        {showAddText && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
              <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Document name" className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none" />
              <textarea value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Paste text content…" rows={4} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none resize-none" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddText(false)} className="text-[12px] text-[var(--text-muted)] hover:text-white px-3 py-1.5">Cancel</button>
                <button onClick={addText} disabled={addingText || !textName.trim() || !textContent.trim()} className="px-3 py-1.5 rounded-lg bg-white text-black text-[12px] font-medium disabled:opacity-40">
                  {addingText ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="px-6 py-4 grid grid-cols-3 gap-4">
          {[
            { label: 'Documents', value: docs.length },
            { label: 'Total Chunks', value: docs.reduce((a, d) => a + d.chunk_count, 0) },
            { label: 'Chunk Size', value: `${kb.chunk_size} chars` },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
              <p className="text-[18px] font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Documents table */}
        <div className="px-6 pb-4">
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Documents</h3>
          {isLoading ? (
            <p className="text-[12px] text-[var(--text-muted)]">Loading…</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border-default)] rounded-xl">
              <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-[13px] text-[var(--text-muted)]">No documents yet — upload a file or add text</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-2)]">
                    {['Name', 'Type', 'Chunks', 'Added'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--surface-2)] transition-colors group">
                      <td className="px-4 py-3 text-white font-medium truncate max-w-xs">{doc.name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] capitalize">{doc.source_type}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{doc.chunk_count}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Search test */}
        <div className="px-6 pb-6">
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Test Search</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Search your knowledge base…"
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
            />
            <button onClick={search} disabled={searching || !query.trim()} className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-medium disabled:opacity-40">
              {searching ? '…' : 'Search'}
            </button>
          </div>
          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((r, i) => (
                <div key={r.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">Result #{i + 1}</span>
                    <span className="text-[10px] font-mono text-indigo-400">{(r.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[12px] text-white leading-relaxed line-clamp-4">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const KnowledgePage: React.FC = () => {
  const { data: kbs = [], isLoading, invalidate } = useKBs()
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<KB | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search ? kbs.filter(kb => kb.name.toLowerCase().includes(search.toLowerCase())) : kbs

  const deleteKB = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this knowledge base and all its documents?')) return
    await apiClient.delete(`/kb/${id}`)
    invalidate()
  }

  if (selected) {
    return (
      <div className="h-full overflow-hidden">
        <KBDetail kb={selected} onBack={() => setSelected(null)} onDeleted={() => { setSelected(null); invalidate() }} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-[15px] font-semibold text-white">Knowledge Base</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New base
        </button>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge bases…"
            className="w-full pl-9 pr-4 py-2 bg-transparent text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_80px_120px_100px_120px] px-6 py-2 border-b border-[var(--border-default)]">
          {['Name', 'Docs', 'Model', 'Created', 'Last Updated'].map(h => (
            <span key={h} className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-[13px] text-[var(--text-muted)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Database className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
            <p className="text-[14px] text-[var(--text-muted)]">{search ? 'No knowledge bases match your search' : 'No knowledge bases yet'}</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create your first knowledge base
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map(kb => (
              <div
                key={kb.id}
                onClick={() => setSelected(kb)}
                className="grid grid-cols-[2fr_80px_120px_100px_120px] px-6 py-3.5 border-b border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer group items-center"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-6 items-center justify-center rounded-md bg-indigo-600/20 flex-shrink-0">
                    <Database className="w-3 h-3 text-indigo-400" />
                  </div>
                  <span className="text-[13px] text-white font-medium truncate">{kb.name}</span>
                </div>
                <span className="text-[13px] text-[var(--text-muted)]">{kb.document_count ?? 0}</span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono truncate">{kb.embedding_model.replace('text-embedding-', '')}</span>
                <span className="text-[12px] text-[var(--text-muted)]">{new Date(kb.created_at).toLocaleDateString()}</span>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-muted)]">{new Date(kb.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={e => deleteKB(kb.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {/* Add new row at bottom */}
            <div
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 text-[13px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New base
            </div>
          </>
        )}
      </div>

      {showCreate && <CreateKBModal onClose={() => setShowCreate(false)} onCreated={invalidate} />}
    </div>
  )
}

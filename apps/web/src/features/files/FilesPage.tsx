import React, { useState, useRef } from 'react'
import {
  Upload, Trash2, Download, Search, File, FileText, Image,
  FileCode, Film, Music, Archive, Plus, Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import apiClient from '@/lib/api/client'
import { cn } from '@/lib/utils'

const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  created_at: z.string().nullable().optional(),
  url: z.string(),
})
type Asset = z.infer<typeof AssetSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  const t = type.toLowerCase()
  if (t.startsWith('image/')) return <Image className={className} />
  if (t.startsWith('video/')) return <Film className={className} />
  if (t.startsWith('audio/')) return <Music className={className} />
  if (t.includes('pdf') || t.includes('word') || t.includes('document')) return <FileText className={className} />
  if (t.includes('json') || t.includes('javascript') || t.includes('typescript') || t.includes('html') || t.includes('css')) return <FileCode className={className} />
  if (t.includes('zip') || t.includes('tar') || t.includes('gzip')) return <Archive className={className} />
  if (t.includes('csv') || t.includes('excel') || t.includes('spreadsheet')) return <FileText className={className} />
  return <File className={className} />
}

function fileColor(type: string): string {
  const t = type.toLowerCase()
  if (t.startsWith('image/')) return '#10b981'
  if (t.startsWith('video/')) return '#8b5cf6'
  if (t.startsWith('audio/')) return '#f59e0b'
  if (t.includes('pdf')) return '#ef4444'
  if (t.includes('json') || t.includes('javascript') || t.includes('html')) return '#3b82f6'
  if (t.includes('csv') || t.includes('excel')) return '#22c55e'
  return '#6366f1'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const FilesPage: React.FC = () => {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => requestJson(z.array(AssetSchema), { url: '/assets/', method: 'GET' }),
    staleTime: 30_000,
  })

  const deleteFile = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const upload = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (!arr.length) return
    setUploading(true)
    try {
      for (const file of arr) {
        const form = new FormData()
        form.append('file', file)
        await apiClient.post('/assets/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      qc.invalidateQueries({ queryKey: ['assets'] })
    } finally { setUploading(false) }
  }

  const filtered = search
    ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : files

  const totalSize = files.reduce((a, f) => a + f.size, 0)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-default)] flex-shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Files</h1>
          {files.length > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {files.length} file{files.length !== 1 ? 's' : ''} · {formatSize(totalSize)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef} type="file" multiple className="hidden"
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[12px] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-focus)] transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Upload
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-2.5 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full pl-9 pr-4 py-1.5 bg-transparent text-[13px] text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Drag-and-drop zone when empty */}
        {!isLoading && files.length === 0 ? (
          <div
            className={cn(
              'm-6 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center py-20 cursor-pointer',
              dragOver ? 'border-[var(--border-focus)] bg-[var(--surface-2)]' : 'border-[var(--border-default)]'
            )}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
          >
            <Upload className="w-10 h-10 text-[var(--text-muted)] mb-3 opacity-30" />
            <p className="text-[14px] font-medium text-white">Drop files here</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">or click to browse — any file type, up to 100 MB</p>
          </div>
        ) : (
          <>
            {/* Drop overlay while dragging over table */}
            <div
              className="relative"
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
            >
              {dragOver && (
                <div className="absolute inset-0 z-10 bg-[var(--surface-2)] border-2 border-dashed border-[var(--border-focus)] rounded-lg m-2 flex items-center justify-center">
                  <p className="text-[13px] text-white font-medium">Drop to upload</p>
                </div>
              )}

              {/* Table header */}
              <div className="grid grid-cols-[2fr_120px_100px_120px_48px] px-6 py-2.5 border-b border-[var(--border-default)]">
                {['Name', 'Type', 'Size', 'Uploaded', ''].map(h => (
                  <span key={h} className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[46px] border-b border-[var(--border-default)] animate-pulse" />
                ))
              ) : filtered.length === 0 ? (
                <div className="px-6 py-8 text-[13px] text-[var(--text-muted)]">No files match "{search}"</div>
              ) : (
                filtered.map(file => {
                  const color = fileColor(file.type)
                  return (
                    <div
                      key={file.id}
                      className="grid grid-cols-[2fr_120px_100px_120px_48px] px-6 py-3 border-b border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-colors items-center group"
                    >
                      {/* Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                          <FileIcon type={file.type} className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-[13px] text-white truncate">{file.name}</span>
                      </div>

                      {/* Type */}
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        {file.type.split('/').pop()?.toUpperCase() ?? file.type}
                      </span>

                      {/* Size */}
                      <span className="text-[12px] text-[var(--text-muted)] font-mono">{formatSize(file.size)}</span>

                      {/* Date */}
                      <span className="text-[12px] text-[var(--text-muted)]">{formatDate(file.created_at)}</span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`/api/v1${file.url}`}
                          download={file.name}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)] transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${file.name}"?`)) deleteFile.mutate(file.id)
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Upload more row */}
              {!isLoading && files.length > 0 && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 text-[12px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading…' : 'Upload more files'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

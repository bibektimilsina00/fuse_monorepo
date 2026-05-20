import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { EdgeProps } from 'reactflow'
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow'
import { Plus, Trash2, Search, X, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useNodes } from '@/hooks/nodes/queries'
import { getIcon } from '../utils/icon-map'

const CATEGORY_ORDER = ['trigger', 'ai', 'integration', 'logic', 'db', 'action']
const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Triggers', ai: 'AI', integration: 'Integrations',
  logic: 'Logic', db: 'Databases', action: 'Actions',
}

// ── Mini node picker popover ──────────────────────────────────────────────────

const NodePicker: React.FC<{
  anchorX: number
  anchorY: number
  onSelect: (type: string) => void
  onClose: () => void
}> = ({ anchorX, anchorY, onSelect, onClose }) => {
  const [search, setSearch] = useState('')
  const [openCat, setOpenCat] = useState<string | null>('ai')
  const ref = useRef<HTMLDivElement>(null)
  const { data: nodeRegistry = [] } = useNodes()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', key) }
  }, [onClose])

  // Group nodes by category
  const categories = React.useMemo(() => {
    const map = new Map<string, any[]>()
    for (const n of nodeRegistry) {
      const cat = n.category || 'action'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(n)
    }
    const ordered: { key: string; label: string; nodes: any[] }[] = []
    for (const key of CATEGORY_ORDER) {
      if (map.has(key)) ordered.push({ key, label: CATEGORY_LABELS[key] || key, nodes: map.get(key)! })
    }
    for (const [key, nodes] of map) {
      if (!CATEGORY_ORDER.includes(key)) ordered.push({ key, label: key, nodes })
    }
    return ordered
  }, [nodeRegistry])

  const query = search.toLowerCase().trim()
  const searchResults = query
    ? nodeRegistry.filter(n => n.name.toLowerCase().includes(query) || n.category?.toLowerCase().includes(query))
    : []

  // Flip if near edges
  const W = 220, H = 360
  const left = anchorX + W > window.innerWidth ? anchorX - W : anchorX
  const top = anchorY + H > window.innerHeight ? anchorY - H : anchorY

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
      style={{ left, top, width: W, maxHeight: H }}
    >
      {/* Search */}
      <div className="p-2 border-b border-[var(--border-default)] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="w-full pl-7 pr-7 py-1.5 bg-[var(--surface-3)] border border-[var(--border-default)] rounded-lg text-[12px] text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {query ? (
          searchResults.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-[var(--text-muted)] text-center">No results</p>
          ) : (
            searchResults.map(n => (
              <NodePickerItem key={n.type} node={n} onSelect={onSelect} />
            ))
          )
        ) : (
          categories.map(({ key, label, nodes }) => (
            <div key={key}>
              <button
                onClick={() => setOpenCat(openCat === key ? null : key)}
                className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-[var(--surface-3)] transition-colors"
              >
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  {label} <span className="opacity-50 normal-case font-normal">{nodes.length}</span>
                </span>
                <ChevronDown className={cn('w-3 h-3 text-[var(--text-muted)] transition-transform', openCat !== key && '-rotate-90')} />
              </button>
              {openCat === key && nodes.map(n => (
                <NodePickerItem key={n.type} node={n} onSelect={onSelect} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  )
}

const NodePickerItem: React.FC<{ node: any; onSelect: (type: string) => void }> = ({ node, onSelect }) => (
  <button
    onClick={() => onSelect(node.type)}
    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[var(--surface-3)] transition-colors text-left"
  >
    <div className="flex size-5 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: node.color || '#3b82f6' }}>
      {React.cloneElement(getIcon(node.icon) as React.ReactElement, { size: 11, className: 'text-white', strokeWidth: 2.5 })}
    </div>
    <span className="text-[12px] text-white truncate">{node.name}</span>
  </button>
)

// ── Custom edge ───────────────────────────────────────────────────────────────

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd,
  data,
}) => {
  const [hovered, setHovered] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null)
  const { edges, setEdges, nodes, setNodes, snapshot } = useWorkflowStore()
  const { data: nodeRegistry = [] } = useNodes()

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const handleDelete = useCallback(() => {
    snapshot()
    setEdges(prev => prev.filter(e => e.id !== id))
  }, [id, setEdges, snapshot])

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Convert flow coords to screen coords
    setPickerPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleNodeSelect = useCallback((nodeType: string) => {
    setPickerPos(null)
    const edge = edges.find(e => e.id === id)
    if (!edge) return

    const def = nodeRegistry.find(d => d.type === nodeType)
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)

    // Place new node at edge midpoint
    const midX = (sourceX + targetX) / 2
    const midY = (sourceY + targetY) / 2
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: midX - (def?.defaultWidth ?? 100), y: midY - 40 },
      data: { label: '', properties: {} },
      ...(def?.defaultWidth ? { width: def.defaultWidth, style: { width: def.defaultWidth, height: def.defaultHeight } } : {}),
    }

    const sourceHandle = edge.sourceHandle || 'source'

    snapshot()
    // Remove old edge, add node + two new edges
    setEdges(prev => [
      ...prev.filter(e => e.id !== id),
      {
        id: `${edge.source}-${newNode.id}`,
        source: edge.source,
        target: newNode.id,
        sourceHandle,
        targetHandle: 'target',
        type: 'custom',
        style: { stroke: 'var(--workflow-edge, #555)', strokeWidth: 2 },
      },
      {
        id: `${newNode.id}-${edge.target}`,
        source: newNode.id,
        target: edge.target,
        sourceHandle: 'source',
        targetHandle: edge.targetHandle || 'target',
        type: 'custom',
        style: { stroke: 'var(--workflow-edge, #555)', strokeWidth: 2 },
      },
    ])
    setNodes(prev => [...prev, newNode])
  }, [id, edges, nodes, nodeRegistry, sourceX, sourceY, targetX, targetY, snapshot, setEdges, setNodes])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: hovered ? 2.5 : 2 }}
        interactionWidth={20}
      />
      {/* Invisible wider hit area for hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="nodrag nopan"
        >
          {hovered && (
            <div className="flex items-center gap-1 animate-in fade-in duration-150">
              {/* Add node */}
              <button
                onClick={handleAddClick}
                className="flex items-center justify-center w-5 h-5 rounded-md bg-green-600 border border-green-500 text-white hover:bg-green-500 transition-all shadow-lg"
                title="Insert node"
              >
                <Plus className="w-3 h-3" />
              </button>
              {/* Delete edge */}
              <button
                onClick={handleDelete}
                className="flex items-center justify-center w-5 h-5 rounded-md bg-red-600 border border-red-500 text-white hover:bg-red-500 transition-all shadow-lg"
                title="Delete edge"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      {pickerPos && (
        <NodePicker
          anchorX={pickerPos.x}
          anchorY={pickerPos.y}
          onSelect={handleNodeSelect}
          onClose={() => setPickerPos(null)}
        />
      )}
    </>
  )
}

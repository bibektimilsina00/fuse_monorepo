import React, { useState, useRef, useMemo } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { ToolbarItem } from '@/features/workflow-editor/components/common/EditorUI'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'
import { useWorkflow } from '@/features/workflow-editor/hooks/use-workflow'
import { useNodes } from '@/hooks/nodes/queries'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER = ['trigger', 'ai', 'integration', 'logic', 'db', 'action']
const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Triggers',
  ai: 'AI',
  integration: 'Integrations',
  logic: 'Logic',
  db: 'Databases',
  action: 'Actions',
}

const CategorySection: React.FC<{
  label: string
  nodes: any[]
  onNodeClick: (type: string) => void
}> = ({ label, nodes, onNodeClick }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between px-4 py-1.5 hover:bg-[var(--surface-hover)] transition-colors group"
      >
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide group-hover:text-white transition-colors">
          {label} <span className="text-[10px] opacity-50 ml-1 normal-case font-normal">{nodes.length}</span>
        </span>
        <ChevronDown className={cn('w-3 h-3 text-[var(--text-muted)] transition-transform duration-200', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="flex flex-col">
          {nodes.map(node => (
            <ToolbarItem key={node.id} {...node} onClick={() => onNodeClick(node.type)} />
          ))}
        </div>
      )}
    </div>
  )
}

export const ToolbarTab = React.memo(() => {
  const [search, setSearch] = useState('')
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { addNode } = useWorkflow()
  const { data: nodeRegistry = [], isLoading, error, refetch } = useNodes()

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const n of nodeRegistry) {
      const cat = n.category || 'action'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push({ id: n.type, label: n.name, type: n.type, icon: getIcon(n.icon), color: n.color || '#3b82f6' })
    }
    // Sort categories in defined order, then alphabetically for unknown ones
    const ordered: Array<{ key: string; label: string; nodes: any[] }> = []
    for (const key of CATEGORY_ORDER) {
      if (map.has(key)) ordered.push({ key, label: CATEGORY_LABELS[key] || key, nodes: map.get(key)! })
    }
    for (const [key, nodes] of map) {
      if (!CATEGORY_ORDER.includes(key)) ordered.push({ key, label: CATEGORY_LABELS[key] || key, nodes })
    }
    return ordered
  }, [nodeRegistry])

  // Search: flat list across all categories
  const query = search.toLowerCase().trim()
  const searchResults = useMemo(() => {
    if (!query) return []
    return nodeRegistry
      .filter(n => n.name.toLowerCase().includes(query) || n.category.toLowerCase().includes(query))
      .map(n => ({ id: n.type, label: n.name, type: n.type, icon: getIcon(n.icon), color: n.color || '#3b82f6', category: n.category }))
  }, [query, nodeRegistry])

  const handleNodeClick = (type: string) => addNode(type) // position auto-computed (smart spawn)

  return (
    <div ref={toolbarRef} className="flex-1 flex flex-col overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/50 backdrop-blur-[2px]">
          <div className="size-5 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-primary)]" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
          <p className="text-[12px] text-red-400 mb-2 font-medium">Failed to load nodes</p>
          <button onClick={() => refetch()} className="text-[11px] px-3 py-1 bg-[var(--surface-3)] hover:bg-[var(--surface-hover)] text-white rounded-md transition-all">
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search nodes…"
                className="w-full pl-8 pr-7 py-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-lg text-[12px] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {query ? (
              searchResults.length === 0 ? (
                <p className="px-4 py-6 text-[12px] text-[var(--text-muted)] text-center">No nodes match "{search}"</p>
              ) : (
                <>
                  {/* Group search results by category too */}
                  {CATEGORY_ORDER.concat(
                    [...new Set(searchResults.map(n => n.category))].filter(c => !CATEGORY_ORDER.includes(c))
                  ).map(cat => {
                    const catNodes = searchResults.filter(n => n.category === cat)
                    if (catNodes.length === 0) return null
                    return (
                      <div key={cat}>
                        <p className="px-4 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          {CATEGORY_LABELS[cat] || cat}
                        </p>
                        {catNodes.map(node => (
                          <ToolbarItem key={node.id} {...node} onClick={() => handleNodeClick(node.type)} />
                        ))}
                      </div>
                    )
                  })}
                </>
              )
            ) : (
              categories.map(({ key, label, nodes }) => (
                <CategorySection key={key} label={label} nodes={nodes} onNodeClick={handleNodeClick} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
})

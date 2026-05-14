import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  Search,
  FileText,
  Folder,
  Zap,
  Database,
  Table,
  Files,
  Workflow as WorkflowIcon,
  Plus,
  Home,
  Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useWorkflows } from '@/features/dashboard/hooks/use-workflows'

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const { data: workflows = [] } = useWorkflows()
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!isSearchOpen)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, setSearchOpen])

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        setSearchValue('')
        inputRef.current?.focus()
      }, 10)
    }
  }, [isSearchOpen])

  const filteredResults = useMemo(() => {
    const query = searchValue.toLowerCase().trim()
    
    const results = [
      {
        title: 'Workflows',
        items: workflows
          .filter(w => !query || w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query))
          .map(w => ({
            id: w.id,
            label: w.name,
            icon: <WorkflowIcon className="w-3.5 h-3.5 text-blue-400" />,
            onClick: () => navigate(`/workflows/${w.id}`)
          }))
      },
      {
        title: 'Actions',
        items: [
          { 
            id: 'new-workflow', 
            label: 'Create new workflow', 
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => navigate('/dashboard') // Or actual create logic
          }
        ].filter(i => !query || i.label.toLowerCase().includes(query))
      },
      {
        title: 'Pages',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-3.5 h-3.5" />, onClick: () => navigate('/dashboard') },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" />, onClick: () => navigate('/settings') },
        ].filter(i => !query || i.label.toLowerCase().includes(query))
      }
    ]

    return results.filter(r => r.items.length > 0)
  }, [workflows, searchValue, navigate])

  if (!isSearchOpen) return null

  const handleItemClick = (onClick: () => void) => {
    onClick()
    setSearchOpen(false)
    setSearchValue('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={() => setSearchOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-[560px] bg-[#1c1c1c] rounded-xl border border-[#2a2a2a] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 h-[48px] border-b border-[#2a2a2a]">
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder-[#666]"
          />
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2 custom-scrollbar">
          {filteredResults.length > 0 ? (
            filteredResults.map((category) => (
              <div key={category.title} className="mb-2">
                <div className="px-4 py-1 text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                  {category.title}
                </div>
                <div className="px-2 space-y-0.5">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.onClick)}
                      className={cn(
                        "flex items-center gap-3 w-full px-2.5 py-1.5 rounded-lg text-[13px] text-[#d1d1d1] hover:bg-[#2a2a2a] hover:text-white transition-colors group text-left"
                      )}
                    >
                      <span className="text-[#888] group-hover:text-white transition-colors">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-[13px] text-[#666]">
              No results found for "{searchValue}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-9 px-4 flex items-center justify-between border-t border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-[10px] text-[#888] font-sans">↑↓</kbd>
              <span className="text-[11px] text-[#666]">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-[10px] text-[#888] font-sans">↵</kbd>
              <span className="text-[11px] text-[#666]">Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-[10px] text-[#888] font-sans">esc</kbd>
            <span className="text-[11px] text-[#666]">Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

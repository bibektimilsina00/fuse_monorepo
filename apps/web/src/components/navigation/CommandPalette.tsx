import React, { useEffect, useState, useRef } from 'react'
import {
  Search,

  FileText,
  Folder,

  Zap,

  Database,
  Table,
  Files
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

const CATEGORIES = [
  {
    title: 'Workflows',
    items: [
      { id: '1', label: 'default-agent', icon: <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> }
    ]
  },
  {
    title: 'Tasks',
    items: [
      { id: '2', label: 'New task', icon: <Zap className="w-3.5 h-3.5" /> },
      { id: '3', label: 'New task', icon: <Zap className="w-3.5 h-3.5" /> }
    ]
  },
  {
    title: 'Files',
    items: [
      { id: '4', label: 'untitled.md', icon: <FileText className="w-3.5 h-3.5" /> }
    ]
  },
  {
    title: 'Workspaces',
    items: [
      { id: '5', label: "bibek's Workspace (current)", icon: <Folder className="w-3.5 h-3.5" />, active: true }
    ]
  },
  {
    title: 'Pages',
    items: [
      { id: '6', label: 'Tables', icon: <Table className="w-3.5 h-3.5" /> },
      { id: '7', label: 'Files', icon: <Files className="w-3.5 h-3.5" /> },
      { id: '8', label: 'Knowledge Base', icon: <Database className="w-3.5 h-3.5" /> }
    ]
  }
]

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  if (!isSearchOpen) return null

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
          {CATEGORIES.map((category) => (
            <div key={category.title} className="mb-2">
              <div className="px-4 py-1 text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                {category.title}
              </div>
              <div className="px-2 space-y-0.5">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 w-full px-2.5 py-1.5 rounded-lg text-[13px] text-[#d1d1d1] hover:bg-[#2a2a2a] hover:text-white transition-colors group text-left",
                      item.active ? "bg-[#2a2a2a] text-white" : ""
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
          ))}
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

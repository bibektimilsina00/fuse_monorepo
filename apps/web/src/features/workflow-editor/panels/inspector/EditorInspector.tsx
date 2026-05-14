import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  Ellipsis, 
  MessageCircle, 
  Play, 
  BookOpen,
  Send,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { CopilotTab } from './CopilotTab'
import { ToolbarTab } from './ToolbarTab'
import { EditorTab } from './EditorTab'

type TabType = 'Copilot' | 'Toolbar' | 'Editor'

interface EditorInspectorProps {
  style?: React.CSSProperties
  className?: string
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({ style, className }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Editor')

  return (
    <aside
      className={cn("flex flex-col border-l border-[var(--border-default)] bg-[var(--bg)] min-w-0 overflow-hidden", className)}
      style={style}
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-3 gap-2">
        <div className="flex items-center gap-1.5">
          <button className="flex items-center justify-center size-7 rounded-md bg-transparent hover:bg-[#2a2a2a] text-[#999] hover:text-white transition-all">
            <Ellipsis className="size-3.5" />
          </button>
          <button className="flex items-center justify-center size-7 rounded-md bg-transparent hover:bg-[#2a2a2a] text-[#999] hover:text-white transition-all">
            <MessageCircle className="size-3.5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 h-[32px] rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--surface-hover)] transition-all">
            <Send className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
            Deploy
          </button>
          <button className="flex items-center gap-2 px-3 h-[32px] rounded-lg bg-[var(--brand-accent)] text-white text-[13px] font-semibold hover:bg-[var(--brand-accent-hover)] transition-all shadow-lg">
            <Play className="w-3.5 h-3.5 fill-current" />
            Run
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-1 px-3 py-1">
        {(['Copilot', 'Toolbar', 'Editor'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
              activeTab === tab 
                ? "bg-[#2e2e2e] text-white" 
                : "text-[#999] hover:text-white hover:bg-[#222]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Header */}
      <div className="flex items-center justify-between px-4 py-2.5 mt-2 border-y border-[var(--border-default)]">
        <span className="text-[13px] font-bold text-white tracking-tight">
          {activeTab === 'Copilot' ? 'New Chat' : activeTab === 'Toolbar' ? 'Toolbar' : activeTab.toUpperCase()}
        </span>
        <div className="flex items-center gap-2.5">
          {activeTab === 'Copilot' && (
            <>
              <Plus className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
              <History className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
            </>
          )}
          {activeTab === 'Toolbar' && (
            <Search className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
          )}
          {activeTab === 'Editor' && (
            <BookOpen className="size-4 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'Copilot' && <CopilotTab />}
        {activeTab === 'Toolbar' && <ToolbarTab />}
        {activeTab === 'Editor' && <EditorTab />}
      </div>
    </aside>
  )
}

import React from 'react'
import { 
  Search, 
  Plus, 
  Ellipsis, 
  MessageCircle, 
  Play, 
  BookOpen,
  Send,
  History,
  Pencil
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, type InspectorTabType } from '@/stores/ui-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'
import { Tooltip } from '@/components/ui/tooltip'
import { useNodes } from '@/hooks/nodes/queries'

import { CopilotTab } from '@/features/workflow-editor/panels/inspector/CopilotTab'
import { ToolbarTab } from '@/features/workflow-editor/panels/inspector/ToolbarTab'
import { EditorTab } from '@/features/workflow-editor/panels/inspector/EditorTab'

import { useExecution } from '@/features/workflow-editor/hooks/use-execution'

interface EditorInspectorProps {
  style?: React.CSSProperties
  className?: string
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({ style, className }) => {
  const { inspectorTab: activeTab, setInspectorTab: setActiveTab } = useUIStore()
  const { nodes, selectedNodeId, updateNodeData } = useWorkflowStore()
  const { data: nodeRegistry = [] } = useNodes()
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [editNameValue, setEditNameValue] = React.useState('')
  const { run, isRunning } = useExecution()
  
  const selectedNode = React.useMemo(() => 
    nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  const definition = React.useMemo(() => 
    selectedNode ? nodeRegistry.find(d => d.type === selectedNode.type) : null,
    [selectedNode, nodeRegistry]
  )

  const handleEditClick = () => {
    if (selectedNode && definition) {
      setEditNameValue(selectedNode.data.label || definition.name)
      setIsEditingName(true)
    }
  }

  const handleNameSave = () => {
    if (selectedNode && editNameValue.trim()) {
      updateNodeData(selectedNode.id, { label: editNameValue.trim() })
    }
    setIsEditingName(false)
  }

  return (
    <aside
      className={cn("flex flex-col h-full border-l border-[var(--border-default)] bg-[var(--bg)] min-w-0 overflow-hidden", className)}
      style={style}
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-3 gap-2">
        <div className="flex items-center gap-1.5">
          <Tooltip content="More options">
            <button className="flex items-center justify-center size-7 rounded-md bg-transparent hover:bg-[#2a2a2a] text-[#999] hover:text-white transition-all">
              <Ellipsis className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="View chat">
            <button className="flex items-center justify-center size-7 rounded-md bg-transparent hover:bg-[#2a2a2a] text-[#999] hover:text-white transition-all">
              <MessageCircle className="size-3.5" />
            </button>
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip content="Deploy workflow">
            <button className="flex items-center gap-2 px-3 h-[32px] rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--surface-hover)] transition-all">
              <Send className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
              Deploy
            </button>
          </Tooltip>
          <Tooltip content={isRunning ? "Running..." : "Run workflow"}>
            <button 
              onClick={() => !isRunning && run()}
              disabled={isRunning}
              className={cn(
                "flex items-center gap-2 px-3 h-[32px] rounded-lg transition-all shadow-lg text-[13px] font-semibold",
                isRunning 
                  ? "bg-[var(--surface-active)] text-[var(--text-muted)] cursor-not-allowed"
                  : "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)]"
              )}
            >
              {isRunning ? (
                <div className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {isRunning ? 'Running' : 'Run'}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-1 px-3 py-1">
        {(['Copilot', 'Toolbar', 'Editor'] as InspectorTabType[]).map((tab) => (
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
      <div className="flex items-center justify-between px-4 py-2.5 mt-2 border-y border-[var(--border-default)] min-h-[45px]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          {activeTab === 'Editor' && selectedNode && definition ? (
            <>
              <div 
                className="flex size-5 items-center justify-center rounded-md flex-shrink-0"
                style={{ backgroundColor: definition.color || '#3b82f6' }}
              >
                {React.cloneElement(getIcon(definition.icon) as React.ReactElement, { className: 'size-3 text-white' })}
              </div>
              {isEditingName ? (
                <input 
                  autoFocus
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className="bg-[#222] rounded px-1.5 py-0.5 text-[13px] font-bold text-white w-full focus:outline-none border-none"
                />
              ) : (
                <span className="text-[13px] font-bold text-white tracking-tight truncate cursor-pointer hover:text-gray-300 transition-colors" onDoubleClick={handleEditClick}>
                  {selectedNode.data.label || definition.name}
                </span>
              )}
            </>
          ) : (
            <span className="text-[13px] font-bold text-white tracking-tight">
              {activeTab === 'Copilot' ? 'New Chat' : activeTab === 'Toolbar' ? 'Toolbar' : activeTab.toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {activeTab === 'Copilot' && (
            <>
              <Tooltip content="New chat">
                <Plus className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
              </Tooltip>
              <Tooltip content="Chat history">
                <History className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
              </Tooltip>
            </>
          )}
          {activeTab === 'Toolbar' && (
            <Tooltip content="Search nodes">
              <Search className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
            </Tooltip>
          )}
          {activeTab === 'Editor' && (
            <>
              {!isEditingName && selectedNode && (
                <Tooltip content="Rename node">
                  <Pencil onClick={handleEditClick} className="size-3.5 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
                </Tooltip>
              )}
              <Tooltip content="Open documentation">
                <BookOpen className="size-4 text-[var(--text-muted)] hover:text-white cursor-pointer transition-colors" />
              </Tooltip>
            </>
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

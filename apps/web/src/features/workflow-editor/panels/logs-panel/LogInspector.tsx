import React, { useState, useRef, useEffect } from 'react'
import {
  Search,
  Clipboard,
  ArrowDownToLine,
  Trash2,
  Ellipsis,
  ChevronDown,
  X
} from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-json'
import { cn } from '@/lib/utils'
import {
  ToolbarButton,
  OptionItem,
  DataNode
} from '@/features/workflow-editor/components/common/EditorUI'

type TabType = 'Output' | 'Input'

interface LogInspectorProps {
  isCollapsed: boolean
  outputWidth: number
  toggleCollapse: () => void
  widthResizerProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
}

export const LogInspector = React.memo(({
  isCollapsed,
  outputWidth,
  toggleCollapse,
  widthResizerProps
}: LogInspectorProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('Output')
  const [isStructuredView, setIsStructuredView] = useState(true)
  const [isWrapView, setIsWrapView] = useState(false)
  const [isOpenOnRun, setIsOpenOnRun] = useState(true)
  const [showOptions, setShowOptions] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const optionsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isSearchOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sampleData = {
    data: null,
    status: 200,
    headers: {
      "content-type": "application/json",
      "server": "cloudflare",
      "x-powered-by": "fuse-engine"
    }
  }

  const jsonString = JSON.stringify(sampleData, null, 2)

  // Simple filtering logic for demonstration
  const filteredNodes = [
    { label: 'data', type: 'null', value: 'null' },
    { label: 'status', type: 'number', value: '200' },
    { label: 'headers', type: 'object', value: JSON.stringify(sampleData.headers, null, 2) }
  ].filter(node => 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    node.value.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Divider for internal width split */}
      {!isCollapsed && (
        <div
          {...widthResizerProps}
          className="relative z-50 w-[6px] -ml-[3px] mr-[-3px] cursor-ew-resize group"
          role="separator"
        >
          <div className="absolute inset-y-0 left-[2.5px] w-[1px] bg-[var(--border-default)]" />
        </div>
      )}

      <div
        className="flex flex-col bg-[var(--bg)] h-full overflow-hidden flex-shrink-0"
        style={{ width: outputWidth, minWidth: outputWidth }}
      >
        <div className="group flex h-[30px] flex-shrink-0 items-center justify-between bg-[var(--bg)] px-4 border-b border-transparent">
          <div className="flex items-center">
            {(['Output', 'Input'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-2 py-1 text-[12px] font-bold transition-all",
                  activeTab === tab ? "text-white" : "text-[var(--text-icon)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            {isSearchOpen ? (
              <div className="flex items-center bg-[var(--surface-1)] rounded px-1.5 py-0.5 border border-[var(--border-default)] h-[22px] mr-1 animate-in fade-in slide-in-from-right-2 duration-200">
                <Search className="size-3 text-[var(--text-muted)] mr-1.5" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-[10px] text-white w-28 placeholder:text-[var(--text-muted)]"
                  onKeyDown={(e) => e.key === 'Escape' && setIsSearchOpen(false)}
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                  <X className="size-2.5 text-[var(--text-muted)] hover:text-white" />
                </button>
              </div>
            ) : (
              <ToolbarButton icon={<Search className="size-3.5" />} label="Search" onClick={() => setIsSearchOpen(true)} />
            )}
            
            <ToolbarButton icon={<Clipboard className="size-3.5" />} label="Copy" onClick={() => navigator.clipboard.writeText(jsonString)} />
            <ToolbarButton icon={<ArrowDownToLine className="size-3.5" />} label="Download" />
            <ToolbarButton icon={<Trash2 className="size-3.5" />} label="Clear" />
            <div className="w-[1px] h-3 bg-[var(--border-default)] mx-1" />

            <div className="relative flex items-center" ref={optionsRef}>
              <ToolbarButton icon={<Ellipsis className="size-3.5" />} label="Options" onClick={() => setShowOptions(!showOptions)} />
              {showOptions && (
                <div className="absolute right-0 top-full mt-1 w-32 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] shadow-xl z-[100] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <OptionItem label="Structured View" checked={isStructuredView} onClick={() => { setIsStructuredView(!isStructuredView); setShowOptions(false); }} />
                  <OptionItem label="Wrap View" checked={isWrapView} onClick={() => { setIsWrapView(!isWrapView); setShowOptions(false); }} />
                  <div className="my-1 border-t border-[var(--border-default)]" />
                  <OptionItem label="Open on Run" checked={isOpenOnRun} onClick={() => { setIsOpenOnRun(!isOpenOnRun); setShowOptions(false); }} />
                </div>
              )}
            </div>

            <ToolbarButton
              icon={<ChevronDown className={cn("size-3.5 transition-transform duration-200", isCollapsed && "rotate-180")} />}
              label={isCollapsed ? "Expand" : "Collapse"}
              onClick={toggleCollapse}
            />
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-5", isCollapsed && "hidden")}>
          {activeTab === 'Output' ? (
            isStructuredView ? (
              <div className="flex flex-col gap-2">
                {filteredNodes.length > 0 ? (
                  filteredNodes.map((node, i) => (
                    <DataNode 
                      key={node.label + i} 
                      label={node.label} 
                      type={node.type as any} 
                      value={node.value} 
                      initialCollapsed={node.label === 'status'} 
                    />
                  ))
                ) : (
                  <div className="text-[var(--text-muted)] text-[12px] italic">No matches found for "{searchQuery}"</div>
                )}
              </div>
            ) : (
              <div className={cn(
                "h-full w-full",
                isWrapView ? "whitespace-pre-wrap" : "whitespace-pre"
              )}>
                <Editor
                  value={jsonString}
                  onValueChange={() => { }}
                  highlight={code => Prism.highlight(code, Prism.languages.json, 'json')}
                  padding={0}
                  className="prism-editor"
                  style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 13,
                  }}
                  readOnly
                />
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-[13px]">
              No input data available for this step
            </div>
          )}
        </div>
      </div>
    </>
  )
})

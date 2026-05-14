import React, { useRef, useState } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  SelectionMode
} from 'reactflow'
import 'reactflow/dist/style.css'

import { EditorInspector } from './panels/inspector/EditorInspector'
import { EditorLogs } from './panels/logs-panel/EditorLogs'
import { WorkflowControls } from './controls/WorkflowControls'
import { useWorkflow } from './hooks/use-workflow'
import { useResizable } from './hooks/use-resizable'

const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 600
const DEFAULT_PANEL_WIDTH = 280

export default function Editor() {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const containerRef = useRef<HTMLDivElement>(null)

  const inspectorResizer = useResizable({
    direction: 'horizontal',
    minSize: MIN_PANEL_WIDTH,
    maxSize: MAX_PANEL_WIDTH,
    onSizeChange: setPanelWidth,
    containerRef: containerRef as React.RefObject<HTMLElement>,
    invert: true
  })

  return (
    <ReactFlowProvider>
      <div ref={containerRef} className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
        <EditorContent />
        <div
          {...inspectorResizer}
          className="w-1 shrink-0 cursor-col-resize select-none z-50 hover:bg-[var(--brand-accent)] transition-colors"
        />
        <EditorInspector style={{ width: panelWidth, minWidth: panelWidth }} className="shrink-0 overflow-hidden" />
      </div>
    </ReactFlowProvider>
  )
}

function EditorContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    reactFlowWrapper,
    mode,
    setMode,
  } = useWorkflow()

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          panOnDrag={mode === 'pan'}
          selectionOnDrag={mode === 'select'}
          panOnScroll={mode === 'select'}
          selectionMode={mode === 'select' ? SelectionMode.Full : SelectionMode.Partial}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          style={{ background: 'var(--bg)' }}
        />
        <WorkflowControls mode={mode} onModeChange={setMode} />
      </div>
      <EditorLogs />
    </div>
  )
}

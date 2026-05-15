import React, { useRef, useState } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  SelectionMode,
  ConnectionLineType,
  Background
} from 'reactflow'
import 'reactflow/dist/style.css'

import { EditorInspector } from '@/features/workflow-editor/panels/inspector/EditorInspector'
import { EditorLogs } from '@/features/workflow-editor/panels/logs-panel/EditorLogs'
import { WorkflowControls } from '@/features/workflow-editor/controls/WorkflowControls'
import { useWorkflow } from '@/features/workflow-editor/hooks/use-workflow'
import { useAutoSave } from '@/features/workflow-editor/hooks/use-auto-save'
import { useWorkflowData } from '@/features/workflow-editor/hooks/use-workflow-data'
import { useResizable } from '@/features/workflow-editor/hooks/use-resizable'
import { NODE_REGISTRY } from '@/nodes/registry'

import { CustomNode } from '@/features/workflow-editor/nodes/CustomNode'
import { ConditionNode } from '@/features/workflow-editor/nodes/ConditionNode'

const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 600
const DEFAULT_PANEL_WIDTH = 280

export default function Editor() {
  const { isLoading, error } = useWorkflowData()
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

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg)]">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--bg)] text-center">
        <p className="mb-4 text-red-500">Failed to load workflow</p>
        <button 
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[var(--surface-3)] px-4 py-2 text-[13px] text-white hover:bg-[var(--surface-hover)]"
        >
          Retry
        </button>
      </div>
    )
  }

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
  useAutoSave()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onDragOver,
    onDrop,
    reactFlowWrapper,
    mode,
    setMode,
  } = useWorkflow()

  // Generate nodeTypes from NODE_REGISTRY dynamically so any node type uses CustomNode
  const dynamicNodeTypes = React.useMemo(() => {
    const types: Record<string, any> = {}
    NODE_REGISTRY.forEach(node => {
      if (node.type === 'logic.condition') {
        types[node.type] = ConditionNode
      } else {
        types[node.type] = CustomNode
      }
    })
    return types
  }, [])

  const [connectionColor, setConnectionColor] = React.useState('var(--workflow-edge, #555)')

  const onConnectStart = React.useCallback((_: any, { handleId }: any) => {
    if (handleId === 'error') {
      setConnectionColor('#ff4d4f')
    } else {
      setConnectionColor('var(--workflow-edge, #555)')
    }
  }, [])

  const onConnectEnd = React.useCallback(() => {
    setConnectionColor('var(--workflow-edge)')
  }, [])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={dynamicNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2 }
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: connectionColor,
            strokeWidth: 2,
            transition: 'stroke 0.2s ease'
          }}
          panOnDrag={mode === 'pan'}
          selectionOnDrag={mode === 'select'}
          panOnScroll={mode === 'select'}
          selectionMode={mode === 'select' ? SelectionMode.Full : SelectionMode.Partial}
          fitView
          fitViewOptions={{ maxZoom: 0.8, padding: 0.2 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          snapToGrid={false}
          snapGrid={[10, 10]}
          style={{ background: 'var(--bg)' }}
        >
          <Background color="#222" gap={20} />
        </ReactFlow>
        <WorkflowControls mode={mode} onModeChange={setMode} />
      </div>
      <EditorLogs />
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useNodes } from '@/hooks/nodes/queries'

import { CopilotTab } from './CopilotTab'
import { ToolbarTab } from './ToolbarTab'
import { EditorTab } from './EditorTab'
import { ActionBar } from './components/action-bar/ActionBar'
import { TabSelector } from './components/tab-selector/TabSelector'
import { NodeHeader } from './components/node-header/NodeHeader'

interface EditorInspectorProps {
  style?: React.CSSProperties
  className?: string
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({ style, className }) => {
  const { inspectorTab: activeTab } = useUIStore()
  const { nodes, selectedNodeId, updateNodeData } = useWorkflowStore()
  const { data: nodeRegistry = [] } = useNodes()
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [editNameValue, setEditNameValue] = React.useState('')

  const selectedNode = React.useMemo(
    () => nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  )

  const definition = React.useMemo(
    () => (selectedNode ? nodeRegistry.find(d => d.type === selectedNode.type) : null),
    [selectedNode, nodeRegistry],
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
      <ActionBar />
      <TabSelector />
      <NodeHeader
        activeTab={activeTab}
        selectedNode={selectedNode}
        definition={definition}
        isEditingName={isEditingName}
        editNameValue={editNameValue}
        onEditNameChange={setEditNameValue}
        onEditClick={handleEditClick}
        onNameSave={handleNameSave}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'Copilot' && <CopilotTab />}
        {activeTab === 'Toolbar' && <ToolbarTab />}
        {activeTab === 'Editor' && <EditorTab />}
      </div>
    </aside>
  )
}

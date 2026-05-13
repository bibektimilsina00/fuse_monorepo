import ReactFlow, { Background, Controls, Panel } from 'reactflow'
import 'reactflow/dist/style.css'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NODE_REGISTRY } from '@/nodes/registry'

export default function Editor() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useWorkflowStore()

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return

    const newNode = {
      id: `${type}-${crypto.randomUUID()}`,
      type: 'default',
      position: { x: event.clientX - 200, y: event.clientY - 40 },
      data: { label: type },
    }

    addNode(newNode)
  }

  return (
    <div className="w-full h-screen flex">
      <aside className="w-64 border-r bg-slate-50 p-4">
        <h2 className="text-lg font-semibold mb-4">Nodes</h2>
        <div className="space-y-2">
          {NODE_REGISTRY.map((node) => (
            <div
              key={node.type}
              className="p-2 border rounded cursor-move hover:bg-slate-100 transition-colors"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', node.type)}
            >
              {node.name}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
        >
          <Background />
          <Controls />
          <Panel position="top-right">
            <button className="px-4 py-2 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-700 transition-colors">
              Save Workflow
            </button>
          </Panel>
        </ReactFlow>
      </main>
    </div>
  )
}

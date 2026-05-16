import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow'
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from 'reactflow'

import type { NodeDefinition } from '@fuse/node-definitions'

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  nodeDefinitions: NodeDefinition[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setNodeDefinitions: (definitions: NodeDefinition[]) => void
  addNode: (node: Node) => void
  updateNodeData: (id: string, data: any) => void
  removeNode: (id: string) => void
  toggleNodeLock: (id: string) => void
  duplicateNode: (id: string) => void
  toggleNodeHandleDirection: (id: string) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  nodeSelectionTimestamp: number
  loadWorkflow: (workflow: any) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeDefinitions: [],
  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },
  onConnect: (connection: Connection) => {
    set({ edges: addEdge(connection, get().edges) })
  },
  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => set({ edges }),
  setNodeDefinitions: (nodeDefinitions: NodeDefinition[]) => set({ nodeDefinitions }),
  addNode: (node: Node) => set({ nodes: [...get().nodes, node] }),
  updateNodeData: (id: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  removeNode: (id: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId
    })
  },
  toggleNodeLock: (id: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          const isLocked = !node.data?.locked
          return {
            ...node,
            draggable: !isLocked,
            selectable: !isLocked,
            deletable: !isLocked,
            data: { ...node.data, locked: isLocked }
          }
        }
        return node
      })
    })
  },
  duplicateNode: (id: string) => {
    const node = get().nodes.find(n => n.id === id)
    if (!node) return
 
    const newNode: Node = {
      ...node,
      id: crypto.randomUUID(),
      position: { x: node.position.x + 20, y: node.position.y + 20 },
      selected: false,
    }
    set({ nodes: [...get().nodes, newNode] })
  },
  toggleNodeHandleDirection: (id: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          const newDirection = node.data?.handleDirection === 'horizontal' ? 'vertical' : 'horizontal'
          return {
            ...node,
            data: { ...node.data, handleDirection: newDirection }
          }
        }
        return node
      })
    })
  },
  selectedNodeId: null,
  nodeSelectionTimestamp: Date.now(),
  setSelectedNodeId: (id: string | null) => set({ 
    selectedNodeId: id,
    nodeSelectionTimestamp: Date.now()
  }),
  loadWorkflow: (workflow: any) => {
    // Assuming the graph contains nodes and edges in the format React Flow expects
    // If it's a raw backend graph, we might need a converter
    const nodes = workflow.graph?.nodes || []
    const edges = workflow.graph?.edges || []
    set({ nodes, edges, selectedNodeId: null, nodeSelectionTimestamp: Date.now() })
  }
}))

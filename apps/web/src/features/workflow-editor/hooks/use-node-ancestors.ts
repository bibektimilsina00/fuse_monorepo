import { useMemo } from 'react'
import type { Node, Edge } from 'reactflow'

export interface AncestorNode {
  node: Node
  direction: 'incoming'
}

/**
 * Hook to find all ancestor nodes in a workflow graph starting from a specific node.
 * Uses Breadth-First Search (BFS) to return nodes in order of proximity (closest first).
 */
export const useNodeAncestors = (selectedNodeId: string | null, nodes: Node[], edges: Edge[]) => {
  return useMemo(() => {
    if (!selectedNodeId) return []
    
    const ancestors: AncestorNode[] = []
    const visited = new Set<string>([selectedNodeId])
    const queue: string[] = [selectedNodeId]

    // BFS to find all upstream nodes, closest first
    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      const upstreamEdges = edges.filter(e => e.target === currentId)
      for (const edge of upstreamEdges) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source)
          const node = nodes.find(n => n.id === edge.source)
          if (node) {
            ancestors.push({ node, direction: 'incoming' })
            queue.push(edge.source)
          }
        }
      }
    }
    
    return ancestors
  }, [selectedNodeId, nodes, edges])
}

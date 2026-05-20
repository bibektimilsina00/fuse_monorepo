/**
 * Node placement utilities — mirrors Sim's approach:
 * - Auto-connect: find closest node by Euclidean distance from right-edge anchor
 * - Smart spawn: find non-overlapping position near viewport center
 * - Auto-layout: topological DAG layout (180px H, 80px V spacing)
 */

const NODE_W = 200  // default node width
const NODE_H = 80   // default node height
const H_SPACING = 180  // horizontal gap between columns
const V_SPACING = 80   // vertical gap between rows
const LAYOUT_PADDING = { x: 150, y: 150 }

// ── Auto-connect ──────────────────────────────────────────────────────────────

/** Right-edge center anchor — same as Sim's getNodeAnchorPosition */
function getAnchor(node: any): { x: number; y: number } {
  const w = node.width ?? node.style?.width ?? node.data?.width ?? NODE_W
  const h = node.height ?? node.style?.height ?? node.data?.height ?? NODE_H
  return { x: node.position.x + Number(w), y: node.position.y + Number(h) / 2 }
}

/**
 * Find the closest connectable node to a drop position.
 * Returns null if no nodes exist or the closest is a trigger-type node.
 */
export function findClosestSourceNode(
  dropPos: { x: number; y: number },
  nodes: any[],
  excludeId?: string
): any | null {
  const candidates = nodes.filter(n =>
    n.id !== excludeId &&
    n.type !== 'logic.loop' // loops have their own connection logic
  )
  if (candidates.length === 0) return null

  let closest: any = null
  let minDist = Infinity

  for (const node of candidates) {
    const anchor = getAnchor(node)
    const dist = (anchor.x - dropPos.x) ** 2 + (anchor.y - dropPos.y) ** 2
    if (dist < minDist) {
      minDist = dist
      closest = node
    }
  }
  return closest
}

/**
 * Build an edge from the closest source to the new node.
 * Mirrors Sim's createEdgeObject + determineSourceHandle.
 */
export function buildAutoConnectEdge(
  sourceNode: any,
  targetId: string
): any | null {
  if (!sourceNode) return null

  // Determine source handle based on node type
  let sourceHandle = 'source'
  const t = sourceNode.type || ''
  if (t === 'logic.loop') sourceHandle = 'loop-end-source'
  if (t === 'logic.condition') sourceHandle = 'true' // first condition branch

  return {
    id: `auto-${sourceNode.id}-${targetId}-${Date.now()}`,
    source: sourceNode.id,
    target: targetId,
    sourceHandle,
    targetHandle: 'target',
    type: 'custom',
    style: { stroke: 'var(--workflow-edge, #555)', strokeWidth: 2 },
  }
}

// ── Smart spawn position ──────────────────────────────────────────────────────

/**
 * Find a non-overlapping spawn position near the viewport center.
 * If no existing nodes, returns the viewport center.
 * Otherwise places to the right of the rightmost node.
 */
export function findSpawnPosition(
  nodes: any[],
  viewportCenter: { x: number; y: number }
): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: viewportCenter.x - NODE_W / 2, y: viewportCenter.y - NODE_H / 2 }
  }

  // Find rightmost node and place to its right
  let maxRight = -Infinity
  let avgY = 0

  for (const n of nodes) {
    const w = n.width ?? n.style?.width ?? n.data?.width ?? NODE_W
    const right = n.position.x + Number(w)
    if (right > maxRight) maxRight = right
    avgY += n.position.y
  }
  avgY = avgY / nodes.length

  return { x: maxRight + H_SPACING, y: avgY }
}

// ── Auto-layout (DAG topological sort) ───────────────────────────────────────

/**
 * Full DAG layout — mirrors Sim's autolayout algorithm.
 * Returns new positions for all nodes as a Map<nodeId, {x,y}>.
 */
export function computeDAGLayout(
  nodes: any[],
  edges: any[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return positions

  // Build adjacency
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()
  for (const n of nodes) {
    outgoing.set(n.id, new Set())
    incoming.set(n.id, new Set())
  }
  for (const e of edges) {
    outgoing.get(e.source)?.add(e.target)
    incoming.get(e.target)?.add(e.source)
  }

  // Assign layers via topological sort (BFS)
  const layers = new Map<string, number>()
  const inDegree = new Map<string, number>()
  for (const n of nodes) inDegree.set(n.id, incoming.get(n.id)?.size ?? 0)

  const queue: string[] = nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0).map(n => n.id)
  if (queue.length === 0 && nodes.length > 0) {
    // Cycle or disconnected — fallback: put all on layer 0
    nodes.forEach(n => layers.set(n.id, 0))
  } else {
    for (const id of queue) layers.set(id, 0)
    const processed = new Set<string>()

    while (queue.length > 0) {
      const id = queue.shift()!
      processed.add(id)
      for (const targetId of outgoing.get(id) ?? []) {
        const maxPreLayer = Math.max(
          ...[...incoming.get(targetId)!].map(src => layers.get(src) ?? 0)
        )
        layers.set(targetId, maxPreLayer + 1)
        const remaining = (inDegree.get(targetId) ?? 0) - 1
        inDegree.set(targetId, remaining)
        if (remaining <= 0 && !processed.has(targetId)) queue.push(targetId)
      }
    }
    // Any unprocessed nodes (disconnected) get layer 0
    for (const n of nodes) if (!layers.has(n.id)) layers.set(n.id, 0)
  }

  // Group by layer
  const byLayer = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    if (!byLayer.has(layer)) byLayer.set(layer, [])
    byLayer.get(layer)!.push(id)
  }

  // Calculate X per layer (cumulative widths)
  const sortedLayerNums = [...byLayer.keys()].sort((a, b) => a - b)
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const layerX = new Map<number, number>()
  let cumulativeX = LAYOUT_PADDING.x
  for (const layerNum of sortedLayerNums) {
    layerX.set(layerNum, cumulativeX)
    const nodesInLayer = byLayer.get(layerNum)!
    const maxW = Math.max(...nodesInLayer.map(id => {
      const n = nodeById.get(id)
      return Number(n?.width ?? n?.style?.width ?? n?.data?.width ?? NODE_W)
    }))
    cumulativeX += maxW + H_SPACING
  }

  // Calculate Y per node in each layer (handle-aligned + overlap resolution)
  for (const layerNum of sortedLayerNums) {
    const ids = byLayer.get(layerNum)!
    const x = layerX.get(layerNum)!

    if (layerNum === 0) {
      // Root layer: stack vertically
      let y = LAYOUT_PADDING.y
      for (const id of ids) {
        positions.set(id, { x, y })
        const n = nodeById.get(id)!
        const h = Number(n?.height ?? n?.style?.height ?? n?.data?.height ?? NODE_H)
        y += h + V_SPACING
      }
      continue
    }

    // Non-root: align Y to source handle midpoint
    for (const id of ids) {
      const srcs = [...(incoming.get(id) ?? [])]
      if (srcs.length > 0) {
        // Average Y of all source anchors
        let avgSourceY = 0
        let count = 0
        for (const srcId of srcs) {
          const pos = positions.get(srcId)
          const srcNode = nodeById.get(srcId)
          if (pos && srcNode) {
            const h = Number(srcNode?.height ?? srcNode?.style?.height ?? NODE_H)
            avgSourceY += pos.y + h / 2
            count++
          }
        }
        if (count > 0) {
          const n = nodeById.get(id)!
          const h = Number(n?.height ?? n?.style?.height ?? n?.data?.height ?? NODE_H)
          positions.set(id, { x, y: avgSourceY / count - h / 2 })
          continue
        }
      }
      // No positioned predecessors yet — stack below last
      positions.set(id, { x, y: LAYOUT_PADDING.y })
    }
  }

  // Resolve vertical overlaps (max 20 iterations)
  resolveOverlaps(nodes, positions, nodeById)

  return positions
}

function resolveOverlaps(
  nodes: any[],
  positions: Map<string, { x: number; y: number }>,
  nodeById: Map<string, any>
) {
  const MARGIN = 30
  for (let iter = 0; iter < 20; iter++) {
    let moved = false
    const sorted = [...positions.entries()].sort((a, b) => a[1].x - b[1].x || a[1].y - b[1].y)

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const [idA, posA] = sorted[i]
        const [idB, posB] = sorted[j]
        if (Math.abs(posA.x - posB.x) > NODE_W + H_SPACING) continue // different columns

        const nA = nodeById.get(idA)
        const nB = nodeById.get(idB)
        const hA = Number(nA?.height ?? nA?.data?.height ?? NODE_H)
        const hB = Number(nB?.height ?? nB?.data?.height ?? NODE_H)

        const overlapY = (posA.y + hA + MARGIN) - posB.y
        if (overlapY > 0) {
          positions.set(idB, { x: posB.x, y: posB.y + overlapY })
          sorted[j][1] = positions.get(idB)!
          moved = true
        }
      }
    }
    if (!moved) break
  }
}

import dagre from '@dagrejs/dagre'
import { Position } from '@xyflow/react'

import {
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  type GraphEdge,
  type GraphLayoutDirection,
  type GraphNode,
} from '#/features/graph/types/graph'

export interface GraphLayoutOptions {
  direction: GraphLayoutDirection
  nodeSeparation?: number
  rankSeparation?: number
}

const GAP_X = 80
const GAP_Y = 40

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { direction }: GraphLayoutOptions,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const isHorizontal = direction === 'LR'

  // If there are edges, use Dagre for tree layout
  if (edges.length > 0) {
    return layoutWithDagre(nodes, edges, direction)
  }

  // No edges: simple grid layout
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))

  return {
    nodes: nodes.map((node, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      return {
        ...node,
        position: {
          x: col * (GRAPH_NODE_WIDTH + GAP_X),
          y: row * (GRAPH_NODE_HEIGHT + GAP_Y),
        },
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
      }
    }),
    edges,
  }
}

function layoutWithDagre(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: GraphLayoutDirection,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const isHorizontal = direction === 'LR'
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  graph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 12,
    marginy: 12,
  })

  for (const node of nodes) {
    graph.setNode(node.id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT })
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  return {
    nodes: nodes.map((node) => {
      const pos = graph.node(node.id)
      return {
        ...node,
        position: {
          x: pos.x - GRAPH_NODE_WIDTH / 2,
          y: pos.y - GRAPH_NODE_HEIGHT / 2,
        },
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
      }
    }),
    edges,
  }
}

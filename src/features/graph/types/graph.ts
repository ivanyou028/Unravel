import { Position, type Edge, type Node, type XYPosition } from '@xyflow/react'

export const graphLayoutDirections = ['TB', 'LR'] as const
export type GraphLayoutDirection = (typeof graphLayoutDirections)[number]

export type GraphConnectionStatus =
  | 'unbound'
  | 'connecting'
  | 'connected'
  | 'error'

export interface GraphNodeRecord {
  id: string
  kind: string
  label: string
  summary?: string
  emphasis?: 1 | 2 | 3 | 4 | 5
  [key: string]: unknown
}

export interface GraphEdgeRecord {
  id: string
  source: string
  target: string
  kind: string
  label?: string
  [key: string]: unknown
}

export type GraphNodeData = GraphNodeRecord
export type GraphEdgeData = Omit<GraphEdgeRecord, 'id' | 'source' | 'target'>

export type GraphNode = Node<GraphNodeData, 'default'>
export type GraphEdge = Edge<GraphEdgeData, 'default'>

export const GRAPH_NODE_WIDTH = 280
export const GRAPH_NODE_HEIGHT = 120

export function createGraphNode(
  record: GraphNodeRecord,
  position: XYPosition = { x: 0, y: 0 },
): GraphNode {
  return {
    id: record.id,
    type: 'default',
    position,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    draggable: true,
    connectable: false,
    selectable: true,
    data: record,
  }
}

export function createGraphEdge(record: GraphEdgeRecord): GraphEdge {
  return {
    id: record.id,
    type: 'default',
    source: record.source,
    target: record.target,
    style: {
      stroke: 'var(--edge)',
      strokeWidth: 1.4,
    },
    data: {
      kind: record.kind,
      label: record.label,
    },
  }
}

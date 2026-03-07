import type { CSSProperties } from 'react'
import {
  MarkerType,
  Position,
  type Edge,
  type Node,
  type XYPosition,
} from '@xyflow/react'

export const graphNodeKinds = ['idea', 'category', 'insight'] as const
export type GraphNodeKind = (typeof graphNodeKinds)[number]

export const graphEdgeKinds = ['association', 'hierarchy', 'reference'] as const
export type GraphEdgeKind = (typeof graphEdgeKinds)[number]

export const graphLayoutDirections = ['TB', 'LR'] as const
export type GraphLayoutDirection = (typeof graphLayoutDirections)[number]

export type GraphConnectionStatus =
  | 'unbound'
  | 'connecting'
  | 'connected'
  | 'error'

interface GraphNodeRecordBase {
  id: string
  label: string
  summary?: string
  emphasis?: 1 | 2 | 3 | 4 | 5
}

export interface IdeaNodeRecord extends GraphNodeRecordBase {
  kind: 'idea'
}

export interface CategoryNodeRecord extends GraphNodeRecordBase {
  kind: 'category'
}

export interface InsightNodeRecord extends GraphNodeRecordBase {
  kind: 'insight'
}

export type GraphNodeRecord =
  | IdeaNodeRecord
  | CategoryNodeRecord
  | InsightNodeRecord

export type GraphNodeData = GraphNodeRecord

export interface GraphEdgeRecord {
  id: string
  source: string
  target: string
  kind: GraphEdgeKind
  label?: string
}

export type GraphEdgeData = Omit<GraphEdgeRecord, 'id' | 'source' | 'target'>

export type GraphNode = Node<GraphNodeData, GraphNodeKind>
export type GraphEdge = Edge<GraphEdgeData, 'smoothstep'>

const nodeAccentMap: Record<GraphNodeKind, string> = {
  idea: 'var(--idea)',
  category: 'var(--category)',
  insight: 'var(--insight)',
}

const edgeAccentMap: Record<GraphEdgeKind, string> = {
  association: 'var(--edge)',
  hierarchy: 'var(--edge)',
  reference: 'var(--edge-strong)',
}

export const graphNodeDimensions: Record<
  GraphNodeKind,
  { width: number; height: number }
> = {
  idea: { width: 280, height: 100 },
  category: { width: 280, height: 100 },
  insight: { width: 280, height: 100 },
}

export function createGraphNode(
  record: GraphNodeRecord,
  position: XYPosition = { x: 0, y: 0 },
): GraphNode {
  return {
    id: record.id,
    type: record.kind,
    position,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    draggable: true,
    connectable: false,
    selectable: true,
    data: record,
    style: {
      '--node-accent': nodeAccentMap[record.kind],
    } as CSSProperties,
  }
}

export function createGraphEdge(record: GraphEdgeRecord): GraphEdge {
  return {
    id: record.id,
    type: 'smoothstep',
    source: record.source,
    target: record.target,
    animated: record.kind === 'reference',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: edgeAccentMap[record.kind],
    },
    style: {
      stroke: edgeAccentMap[record.kind],
      strokeWidth: record.kind === 'hierarchy' ? 1.7 : 1.4,
    },
    data: {
      kind: record.kind,
      label: record.label,
    },
  }
}

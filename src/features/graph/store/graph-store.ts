import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { create } from 'zustand'

import type { InboundGraphEvent } from '#/features/graph/contracts/inbound-graph-events'
import { layoutGraph } from '#/features/graph/lib/layout-graph'
import {
  createGraphEdge,
  createGraphNode,
  type GraphConnectionStatus,
  type GraphEdge,
  type GraphEdgeRecord,
  type GraphLayoutDirection,
  type GraphNode,
  type GraphNodeData,
  type GraphNodeRecord,
} from '#/features/graph/types/graph'

export interface GraphStoreState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  layoutDirection: GraphLayoutDirection
  autoLayout: boolean
  connectionStatus: GraphConnectionStatus
  lastEventId: string | null
  lastEventAt: string | null
}

export interface GraphStoreActions {
  setConnectionStatus: (status: GraphConnectionStatus) => void
  replaceGraph: (
    nodes: GraphNodeRecord[],
    edges: GraphEdgeRecord[],
    options?: { direction?: GraphLayoutDirection; relayout?: boolean },
  ) => void
  upsertNode: (
    node: GraphNodeRecord,
    options?: { positionHint?: XYPosition; relayout?: boolean },
  ) => void
  updateNode: (
    nodeId: string,
    updates: Partial<Omit<GraphNodeData, 'id' | 'kind'>>,
    options?: { relayout?: boolean },
  ) => void
  removeNode: (nodeId: string, options?: { relayout?: boolean }) => void
  upsertEdge: (edge: GraphEdgeRecord, options?: { relayout?: boolean }) => void
  updateEdge: (
    edgeId: string,
    updates: Partial<Omit<GraphEdgeRecord, 'id' | 'source' | 'target'>>,
    options?: { relayout?: boolean },
  ) => void
  removeEdge: (edgeId: string, options?: { relayout?: boolean }) => void
  onNodesChange: (changes: NodeChange<GraphNode>[]) => void
  onEdgesChange: (changes: EdgeChange<GraphEdge>[]) => void
  triggerLayout: (direction?: GraphLayoutDirection) => void
  applyEvent: (event: InboundGraphEvent) => void
  reset: () => void
}

export type GraphStore = GraphStoreState & GraphStoreActions

const initialState: GraphStoreState = {
  nodes: [],
  edges: [],
  layoutDirection: 'TB',
  autoLayout: true,
  connectionStatus: 'unbound',
  lastEventId: null,
  lastEventAt: null,
}

function maybeLayout(
  state: GraphStoreState,
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: GraphLayoutDirection = state.layoutDirection,
  relayout = state.autoLayout,
) {
  if (!relayout) {
    return {
      nodes,
      edges,
      layoutDirection: direction,
    }
  }

  return {
    ...layoutGraph(nodes, edges, {
      direction,
    }),
    layoutDirection: direction,
  }
}

export const useGraphStore = create<GraphStore>((set) => ({
  ...initialState,
  setConnectionStatus: (status) => {
    set({ connectionStatus: status })
  },
  replaceGraph: (nodeRecords, edgeRecords, options) => {
    set((state) => {
      const nextNodes = nodeRecords.map((record) => createGraphNode(record))
      const nextEdges = edgeRecords.map((record) => createGraphEdge(record))
      const direction = options?.direction ?? state.layoutDirection

      return maybeLayout(
        state,
        nextNodes,
        nextEdges,
        direction,
        options?.relayout ?? true,
      )
    })
  },
  upsertNode: (node, options) => {
    set((state) => {
      const nextNodes = state.nodes.some(
        (existingNode) => existingNode.id === node.id,
      )
        ? state.nodes.map((existingNode) =>
            existingNode.id === node.id
              ? {
                  ...existingNode,
                  data: node,
                  type: node.kind,
                  style: createGraphNode(node).style,
                }
              : existingNode,
          )
        : [...state.nodes, createGraphNode(node, options?.positionHint)]

      return maybeLayout(
        state,
        nextNodes,
        state.edges,
        state.layoutDirection,
        options?.relayout ?? state.autoLayout,
      )
    })
  },
  updateNode: (nodeId, updates, options) => {
    set((state) => {
      const nextNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node,
      )

      return maybeLayout(
        state,
        nextNodes,
        state.edges,
        state.layoutDirection,
        options?.relayout ?? false,
      )
    })
  },
  removeNode: (nodeId, options) => {
    set((state) => {
      const nextNodes = state.nodes.filter((node) => node.id !== nodeId)
      const nextEdges = state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      )

      return maybeLayout(
        state,
        nextNodes,
        nextEdges,
        state.layoutDirection,
        options?.relayout ?? state.autoLayout,
      )
    })
  },
  upsertEdge: (edge, options) => {
    set((state) => {
      const nextEdges = state.edges.some(
        (existingEdge) => existingEdge.id === edge.id,
      )
        ? state.edges.map((existingEdge) =>
            existingEdge.id === edge.id ? createGraphEdge(edge) : existingEdge,
          )
        : [...state.edges, createGraphEdge(edge)]

      return maybeLayout(
        state,
        state.nodes,
        nextEdges,
        state.layoutDirection,
        options?.relayout ?? state.autoLayout,
      )
    })
  },
  updateEdge: (edgeId, updates, options) => {
    set((state) => {
      const nextEdges = state.edges.map((edge) =>
        edge.id === edgeId
          ? createGraphEdge({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              kind: updates.kind ?? edge.data.kind,
              label:
                updates.label !== undefined ? updates.label : edge.data.label,
            })
          : edge,
      )

      return maybeLayout(
        state,
        state.nodes,
        nextEdges,
        state.layoutDirection,
        options?.relayout ?? false,
      )
    })
  },
  removeEdge: (edgeId, options) => {
    set((state) => {
      const nextEdges = state.edges.filter((edge) => edge.id !== edgeId)

      return maybeLayout(
        state,
        state.nodes,
        nextEdges,
        state.layoutDirection,
        options?.relayout ?? state.autoLayout,
      )
    })
  },
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }))
  },
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },
  triggerLayout: (direction) => {
    set((state) =>
      maybeLayout(
        state,
        state.nodes,
        state.edges,
        direction ?? state.layoutDirection,
        true,
      ),
    )
  },
  applyEvent: (event) => {
    set((state) => {
      switch (event.type) {
        case 'graph.node.upsert': {
          const nextNodes = state.nodes.some(
            (node) => node.id === event.node.id,
          )
            ? state.nodes.map((node) =>
                node.id === event.node.id
                  ? {
                      ...node,
                      data: event.node,
                      type: event.node.kind,
                      style: createGraphNode(event.node).style,
                    }
                  : node,
              )
            : [...state.nodes, createGraphNode(event.node, event.positionHint)]

          return {
            ...maybeLayout(
              state,
              nextNodes,
              state.edges,
              state.layoutDirection,
              event.relayout ?? state.autoLayout,
            ),
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
        }
        case 'graph.node.remove': {
          const nextNodes = state.nodes.filter(
            (node) => node.id !== event.nodeId,
          )
          const nextEdges = state.edges.filter(
            (edge) =>
              edge.source !== event.nodeId && edge.target !== event.nodeId,
          )

          return {
            ...maybeLayout(
              state,
              nextNodes,
              nextEdges,
              state.layoutDirection,
              event.relayout ?? state.autoLayout,
            ),
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
        }
        case 'graph.edge.upsert': {
          const nextEdges = state.edges.some(
            (edge) => edge.id === event.edge.id,
          )
            ? state.edges.map((edge) =>
                edge.id === event.edge.id ? createGraphEdge(event.edge) : edge,
              )
            : [...state.edges, createGraphEdge(event.edge)]

          return {
            ...maybeLayout(
              state,
              state.nodes,
              nextEdges,
              state.layoutDirection,
              event.relayout ?? state.autoLayout,
            ),
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
        }
        case 'graph.edge.remove': {
          const nextEdges = state.edges.filter(
            (edge) => edge.id !== event.edgeId,
          )

          return {
            ...maybeLayout(
              state,
              state.nodes,
              nextEdges,
              state.layoutDirection,
              event.relayout ?? state.autoLayout,
            ),
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
        }
        case 'graph.layout':
          return {
            ...maybeLayout(
              state,
              state.nodes,
              state.edges,
              event.direction ?? state.layoutDirection,
              true,
            ),
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
        case 'graph.reset':
          return {
            ...initialState,
            lastEventId: event.eventId,
            lastEventAt: event.occurredAt,
          }
      }
    })
  },
  reset: () => {
    set(initialState)
  },
}))

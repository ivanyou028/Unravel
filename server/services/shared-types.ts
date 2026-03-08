// Server-side mirror of frontend contracts.
// Source of truth: src/features/graph/types/graph.ts
//                  src/features/graph/contracts/inbound-graph-events.ts

// --- Graph data types ---

export type GraphNodeKind = 'idea' | 'category' | 'insight'
export type GraphEdgeKind = 'association' | 'hierarchy' | 'reference'

export interface GraphNodeRecord {
  id: string
  kind: GraphNodeKind
  label: string // 1-140 chars
  summary?: string // max 280 chars
  emphasis?: 1 | 2 | 3 | 4 | 5
}

export interface GraphEdgeRecord {
  id: string
  source: string
  target: string
  kind: GraphEdgeKind
  label?: string // max 120 chars
}

// --- Event envelope ---

export interface EventEnvelope {
  version: 1
  eventId: string // UUID
  occurredAt: string // ISO 8601
}

// --- Inbound graph events (server → client) ---

export interface GraphNodeUpsertEvent extends EventEnvelope {
  type: 'graph.node.upsert'
  node: GraphNodeRecord
  positionHint?: { x: number; y: number }
  relayout?: boolean
}

export interface GraphNodeRemoveEvent extends EventEnvelope {
  type: 'graph.node.remove'
  nodeId: string
  relayout?: boolean
}

export interface GraphEdgeUpsertEvent extends EventEnvelope {
  type: 'graph.edge.upsert'
  edge: GraphEdgeRecord
  relayout?: boolean
}

export interface GraphEdgeRemoveEvent extends EventEnvelope {
  type: 'graph.edge.remove'
  edgeId: string
  relayout?: boolean
}

export interface GraphLayoutEvent extends EventEnvelope {
  type: 'graph.layout'
  direction?: 'TB' | 'LR'
}

export interface GraphResetEvent extends EventEnvelope {
  type: 'graph.reset'
}

export type InboundGraphEvent =
  | GraphNodeUpsertEvent
  | GraphNodeRemoveEvent
  | GraphEdgeUpsertEvent
  | GraphEdgeRemoveEvent
  | GraphLayoutEvent
  | GraphResetEvent

// --- WebSocket messages (server → client) ---

export interface TranscriptMessage {
  type: 'transcript'
  transcript: string
  is_final: boolean
  speech_final: boolean
}

export interface AiResponseMessage {
  type: 'ai.response'
  text: string
  debug?: {
    systemPrompt: string
    messages: unknown[]
    rawResponse: string
  }
}

export interface AiDebugMessage {
  type: 'ai.debug'
  debug: {
    systemPrompt: string
    messages: unknown[]
    rawResponse: string
  }
}

export interface UtteranceEndMessage {
  type: 'utterance_end'
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type ServerToClientMessage =
  | TranscriptMessage
  | AiResponseMessage
  | AiDebugMessage
  | UtteranceEndMessage
  | InboundGraphEvent
  | ErrorMessage

// --- Session types ---

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

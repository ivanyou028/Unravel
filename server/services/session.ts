import { randomUUID } from 'crypto'
import type {
  ConversationMessage,
  GraphNodeRecord,
  GraphEdgeRecord,
  InboundGraphEvent,
} from './shared-types.js'

const MAX_HISTORY = 50

export interface SessionState {
  id: string
  topic?: string
  createdAt: string
  conversationHistory: ConversationMessage[]
  graphNodes: Map<string, GraphNodeRecord>
  graphEdges: Map<string, GraphEdgeRecord>
}

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map()

  create(topic?: string): SessionState {
    const session: SessionState = {
      id: randomUUID(),
      topic,
      createdAt: new Date().toISOString(),
      conversationHistory: [],
      graphNodes: new Map(),
      graphEdges: new Map(),
    }
    this.sessions.set(session.id, session)
    console.log(`[session] Created ${session.id}${topic ? ` (topic: "${topic}")` : ''}`)
    return session
  }

  get(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    return session
  }

  destroy(sessionId: string): void {
    this.sessions.delete(sessionId)
    console.log(`[session] Destroyed ${sessionId}`)
  }

  addUserMessage(sessionId: string, text: string): void {
    const session = this.get(sessionId)
    session.conversationHistory.push({ role: 'user', content: text })
    if (session.conversationHistory.length > MAX_HISTORY) {
      session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY)
    }
  }

  addAssistantMessage(sessionId: string, text: string): void {
    const session = this.get(sessionId)
    session.conversationHistory.push({ role: 'assistant', content: text })
    if (session.conversationHistory.length > MAX_HISTORY) {
      session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY)
    }
  }

  applyGraphEvents(sessionId: string, events: InboundGraphEvent[]): void {
    const session = this.get(sessionId)
    for (const event of events) {
      switch (event.type) {
        case 'graph.node.upsert':
          session.graphNodes.set(event.node.id, event.node)
          break
        case 'graph.node.remove':
          session.graphNodes.delete(event.nodeId)
          // Remove edges referencing this node
          for (const [edgeId, edge] of session.graphEdges) {
            if (edge.source === event.nodeId || edge.target === event.nodeId) {
              session.graphEdges.delete(edgeId)
            }
          }
          break
        case 'graph.edge.upsert':
          session.graphEdges.set(event.edge.id, event.edge)
          break
        case 'graph.edge.remove':
          session.graphEdges.delete(event.edgeId)
          break
      }
    }
  }

  getGraphSnapshot(sessionId: string): {
    nodes: GraphNodeRecord[]
    edges: GraphEdgeRecord[]
  } {
    const session = this.get(sessionId)
    return {
      nodes: Array.from(session.graphNodes.values()),
      edges: Array.from(session.graphEdges.values()),
    }
  }
}

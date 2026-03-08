import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import type {
  ConversationMessage,
  GraphNodeRecord,
  GraphEdgeRecord,
  GraphNodeKind,
  GraphEdgeKind,
  InboundGraphEvent,
} from './shared-types.js'

const NODE_KINDS = new Set<string>(['idea', 'category', 'insight'])
const EDGE_KINDS = new Set<string>(['association', 'hierarchy', 'reference'])

export interface AiProcessingInput {
  transcript: string
  conversationHistory: ConversationMessage[]
  currentGraph: {
    nodes: GraphNodeRecord[]
    edges: GraphEdgeRecord[]
  }
  topic?: string
}

export interface AiProcessingResult {
  graphEvents: InboundGraphEvent[]
  response?: string
  debug?: {
    systemPrompt: string
    messages: unknown[]
    rawResponse: string
  }
}

export class AiService {
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    }
    return this.client
  }

  async processUtterance(input: AiProcessingInput): Promise<AiProcessingResult> {
    const systemPrompt = this.buildSystemPrompt(input)
    const messages = this.buildMessages(input)

    const response = await this.getClient().messages.create({
      model: process.env.LLM_MODEL || 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const parsed = this.parseResponse(text)

    parsed.debug = {
      systemPrompt,
      messages,
      rawResponse: text,
    }

    return parsed
  }

  private buildSystemPrompt(input: AiProcessingInput): string {
    const topicLine = input.topic
      ? `The user is brainstorming about: "${input.topic}".`
      : 'The user has not specified a topic yet.'

    const nodesJson =
      input.currentGraph.nodes.length > 0
        ? JSON.stringify(input.currentGraph.nodes, null, 2)
        : '(none yet)'

    const edgesJson =
      input.currentGraph.edges.length > 0
        ? JSON.stringify(input.currentGraph.edges, null, 2)
        : '(none yet)'

    return `You are a data extraction system. Your job is to listen to a raw, messy, stream-of-consciousness transcript from a user and extract key concepts to build a structured knowledge graph.

${topicLine}

## Current Graph State
NODES:
${nodesJson}

EDGES:
${edgesJson}

## Graph Mutation Rules
Analyze the user's speech and produce graph mutations:
- Create "idea" nodes for distinct ideas, opinions, or proposals
- Create "category" nodes when you identify thematic groupings (2+ related ideas)
- Create "insight" nodes for realizations, tensions, or synthesis points
- Create "association" edges between related ideas
- Create "hierarchy" edges from categories to their children
- Create "reference" edges for cross-references between clusters
- ALWAYS reference existing node IDs when creating edges to existing nodes
- Generate UUIDs for new node and edge IDs (format: "n-<short-id>" for nodes, "e-<short-id>" for edges)
- Set emphasis (1-5) based on how central/important the idea seems
- Labels: max 140 chars for nodes, max 120 chars for edges
- Summaries: max 280 chars, optional, for nodes that need elaboration
- Do NOT create duplicate nodes for ideas already on the graph — update them instead

## Response Format
Respond with ONLY a JSON object. No markdown, no code fences, no explanation outside the JSON. Do NOT include a conversational response.

{
  "graphEvents": [
    {
      "type": "graph.node.upsert",
      "node": { "id": "n-abc123", "kind": "idea", "label": "Short label", "summary": "Optional longer summary", "emphasis": 3 }
    },
    {
      "type": "graph.edge.upsert",
      "edge": { "id": "e-def456", "source": "n-abc123", "target": "n-existing", "kind": "association", "label": "optional edge label" }
    }
  ]
}

Event types you can use: graph.node.upsert, graph.node.remove, graph.edge.upsert, graph.edge.remove

Do NOT include version, eventId, or occurredAt — the server adds those.
The "graphEvents" array may be empty [] if no graph changes are warranted.`
  }

  private buildMessages(input: AiProcessingInput): Anthropic.MessageParam[] {
    // We pass the new transcript as the user message.
    // If you want full history, you can access input.conversationHistory here too.
    return [
      {
        role: 'user',
        content: `Here is the latest stream of text from the user:\n\n"""\n${input.transcript}\n"""\n\nBased on this transcript, what nodes and edges should be populated?`,
      },
    ]
  }

  private sanitizeNode(raw: Record<string, unknown>): GraphNodeRecord | null {
    const { id, kind, label, summary, emphasis } = raw
    if (typeof id !== 'string' || !id) return null
    if (typeof label !== 'string' || !label) return null
    if (!NODE_KINDS.has(kind as string)) return null

    const node: GraphNodeRecord = {
      id,
      kind: kind as GraphNodeKind,
      label: label.slice(0, 140),
    }
    if (typeof summary === 'string' && summary) node.summary = summary.slice(0, 280)
    if (typeof emphasis === 'number' && emphasis >= 1 && emphasis <= 5) {
      node.emphasis = Math.round(emphasis) as 1 | 2 | 3 | 4 | 5
    }
    return node
  }

  private sanitizeEdge(raw: Record<string, unknown>): GraphEdgeRecord | null {
    const { id, source, target, kind, label } = raw
    if (typeof id !== 'string' || !id) return null
    if (typeof source !== 'string' || !source) return null
    if (typeof target !== 'string' || !target) return null
    if (!EDGE_KINDS.has(kind as string)) return null

    const edge: GraphEdgeRecord = {
      id,
      source,
      target,
      kind: kind as GraphEdgeKind,
    }
    if (typeof label === 'string' && label) edge.label = label.slice(0, 120)
    return edge
  }

  private parseResponse(text: string): AiProcessingResult {
    // Strip markdown code fences if Claude adds them despite instructions
    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsed: { graphEvents?: unknown[]; response?: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[ai] Failed to parse Claude response as JSON:', cleaned.slice(0, 200))
      return { graphEvents: [], response: cleaned }
    }

    // Sanitize and stamp each graph event with envelope fields
    const graphEvents: InboundGraphEvent[] = []
    if (Array.isArray(parsed.graphEvents)) {
      for (const raw of parsed.graphEvents) {
        if (!raw || typeof raw !== 'object' || !('type' in raw)) continue
        const event = raw as Record<string, unknown>
        const type = event.type as string

        if (type === 'graph.node.upsert') {
          const node = this.sanitizeNode((event.node ?? {}) as Record<string, unknown>)
          if (!node) continue
          graphEvents.push({
            type,
            node,
            relayout: true,
            version: 1,
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          })
        } else if (type === 'graph.edge.upsert') {
          const edge = this.sanitizeEdge((event.edge ?? {}) as Record<string, unknown>)
          if (!edge) continue
          graphEvents.push({
            type,
            edge,
            relayout: true,
            version: 1,
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          })
        } else if (type === 'graph.node.remove' && typeof event.nodeId === 'string') {
          graphEvents.push({
            type,
            nodeId: event.nodeId,
            relayout: true,
            version: 1,
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          })
        } else if (type === 'graph.edge.remove' && typeof event.edgeId === 'string') {
          graphEvents.push({
            type,
            edgeId: event.edgeId,
            relayout: true,
            version: 1,
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
          })
        }
      }
    }

    return {
      graphEvents,
      response: typeof parsed.response === 'string' ? parsed.response : undefined,
    }
  }
}

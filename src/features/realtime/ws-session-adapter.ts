import type {
  GraphEventAdapter,
  GraphEventListener,
} from '#/features/realtime/graph-event-adapter'
import { inboundGraphEventSchema } from '#/features/graph/contracts/inbound-graph-events'
import type { InboundGraphEvent } from '#/features/graph/contracts/inbound-graph-events'
import type { GraphConnectionStatus } from '#/features/graph/types/graph'

export interface TranscriptData {
  transcript: string
  is_final: boolean
  speech_final: boolean
}

export interface WsSessionAdapterCallbacks {
  onTranscript?: (data: TranscriptData) => void
  onAiResponse?: (text: string) => void
  onAiDebug?: (debug: any) => void
  onUtteranceEnd?: () => void
  onError?: (message: string) => void
  onStatusChange?: (status: GraphConnectionStatus) => void
}

const GRAPH_EVENT_TYPES = new Set([
  'graph.node.upsert',
  'graph.node.remove',
  'graph.edge.upsert',
  'graph.edge.remove',
  'graph.layout',
  'graph.reset',
])

export class WsSessionAdapter implements GraphEventAdapter {
  readonly name = 'ws-session'

  private ws: WebSocket | null = null
  private listeners: Set<GraphEventListener> = new Set()
  private sessionId: string
  private callbacks: WsSessionAdapterCallbacks

  constructor(sessionId: string, callbacks?: WsSessionAdapterCallbacks) {
    this.sessionId = sessionId
    this.callbacks = callbacks ?? {}
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsBase =
        (import.meta.env.VITE_API_BASE as string)?.replace(/^http/, 'ws') ||
        'ws://localhost:3001'
      const url = `${wsBase}/ws/session?sessionId=${this.sessionId}`

      this.callbacks.onStatusChange?.('connecting')
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.callbacks.onStatusChange?.('connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleMessage(event.data)
        }
      }

      this.ws.onclose = () => {
        this.callbacks.onStatusChange?.('unbound')
      }

      this.ws.onerror = () => {
        this.callbacks.onStatusChange?.('error')
        reject(new Error('WebSocket connection failed'))
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }

  subscribe(listener: GraphEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  sendAudio(data: ArrayBuffer | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }

  private emit(event: InboundGraphEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private handleMessage(data: string): void {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }

    const type = msg.type as string

    if (GRAPH_EVENT_TYPES.has(type)) {
      const parsed = inboundGraphEventSchema.safeParse(msg)
      if (parsed.success) {
        this.emit(parsed.data)
      } else {
        console.warn('[ws-adapter] Graph event failed validation:', type, parsed.error.issues)
      }
      return
    }

    switch (type) {
      case 'transcript':
        this.callbacks.onTranscript?.({
          transcript: msg.transcript as string,
          is_final: msg.is_final as boolean,
          speech_final: msg.speech_final as boolean,
        })
        break
      case 'ai.response':
        this.callbacks.onAiResponse?.(msg.text as string)
        if (msg.debug) {
          this.callbacks.onAiDebug?.(msg.debug)
        }
        break
      case 'ai.debug':
        this.callbacks.onAiDebug?.(msg.debug)
        break
      case 'utterance_end':
        this.callbacks.onUtteranceEnd?.()
        break
      case 'error':
        this.callbacks.onError?.(msg.message as string)
        break
    }
  }
}

import type { WebSocket } from 'ws'
import { DeepgramService } from '../services/deepgram.js'
import { AiService } from '../services/ai.js'
import type { SessionManager } from '../services/session.js'
import type { ServerToClientMessage } from '../services/shared-types.js'

const aiService = new AiService()

export function handleSessionSocket(
  ws: WebSocket,
  sessionId: string,
  sessionManager: SessionManager,
): void {
  const session = sessionManager.get(sessionId)
  console.log(`[ws] Client connected to session ${sessionId}`)

  let destroyed = false

  // --- Utterance accumulation buffer ---
  let pendingTranscripts: string[] = []
  let isProcessing = false

  // --- Send JSON message to client ---
  function sendToClient(message: ServerToClientMessage): void {
    if (!destroyed && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // --- Deepgram STT ---
  const deepgram = new DeepgramService({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    onEvent: (event) => {
      if (destroyed) return

      if (event.type === 'transcript') {
        // Forward to client for live display
        sendToClient(event)

        // Accumulate final transcripts for AI processing
        if (event.is_final && event.transcript.trim()) {
          pendingTranscripts.push(event.transcript)
        }
      } else if (event.type === 'utterance_end') {
        sendToClient({ type: 'utterance_end' })
        processAccumulatedTranscripts()
      }
    },
    onError: (error) => {
      sendToClient({ type: 'error', message: error.message })
    },
    onClose: () => {
      if (!destroyed) {
        console.warn('[deepgram] Disconnected unexpectedly, reconnecting...')
        setTimeout(() => {
          if (!destroyed) deepgram.connect()
        }, 1000)
      }
    },
  })

  deepgram.connect()

  // --- AI processing pipeline ---
  async function processAccumulatedTranscripts(): Promise<void> {
    if (destroyed || pendingTranscripts.length === 0 || isProcessing) return
    isProcessing = true

    const transcript = pendingTranscripts.join(' ')
    pendingTranscripts = []

    try {
      sessionManager.addUserMessage(sessionId, transcript)

      const graphSnapshot = sessionManager.getGraphSnapshot(sessionId)

      console.log(`[ai] Processing: "${transcript.slice(0, 80)}..."`)

      const result = await aiService.processUtterance({
        transcript,
        conversationHistory: session.conversationHistory,
        currentGraph: graphSnapshot,
        topic: session.topic,
      })

      if (destroyed) return

      // Stream graph events to client
      for (const event of result.graphEvents) {
        sendToClient(event)
      }

      // Update server-side graph state
      sessionManager.applyGraphEvents(sessionId, result.graphEvents)

      // Send AI conversational response
      if (result.response) {
        sendToClient({ type: 'ai.response', text: result.response })
        sessionManager.addAssistantMessage(sessionId, result.response)
      }

      console.log(
        `[ai] Done: ${result.graphEvents.length} events, response: ${result.response ? 'yes' : 'no'}`,
      )
    } catch (error) {
      console.error('[ai] Processing error:', error)
      sendToClient({
        type: 'error',
        message: error instanceof Error ? error.message : 'AI processing failed',
      })
    } finally {
      isProcessing = false
      // Process any transcripts that arrived during AI call
      if (!destroyed && pendingTranscripts.length > 0) {
        await processAccumulatedTranscripts()
      }
    }
  }

  // --- Handle incoming messages from client ---
  ws.on('message', (data, isBinary) => {
    if (isBinary && !destroyed) {
      deepgram.sendAudio(data as Buffer)
    }
  })

  // --- Cleanup ---
  ws.on('close', () => {
    console.log(`[ws] Client disconnected from session ${sessionId}`)
    destroyed = true
    deepgram.disconnect()
  })

  ws.on('error', (err) => {
    console.error(`[ws] Error on session ${sessionId}:`, err.message)
    destroyed = true
    deepgram.disconnect()
  })
}

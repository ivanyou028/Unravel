import type { WebSocket } from 'ws'
import { DeepgramService } from '../services/deepgram.js'
import { AiService } from '../services/ai.js'
import type { SessionManager } from '../services/session.js'
import type { ServerToClientMessage, InboundGraphEvent } from '../services/shared-types.js'

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

  // --- Selection context from client ---
  let selectedNodeIds: string[] = []

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

        // Accumulate transcripts (both interim and final) for AI processing based on timer
        if (event.transcript.trim()) {
          pendingTranscripts.push(event.transcript)

          if (sessionStartTime) {
            const elapsed = (Date.now() - sessionStartTime) / 1000;
            if (elapsed < 5) {
              // Heuristic: Auto-create/update the "Main Topic" node instantly on interim chunks
              const snapshot = sessionManager.getGraphSnapshot(sessionId)
              if (snapshot.nodes.length === 0 || (snapshot.nodes.length === 1 && snapshot.nodes[0].id === 'n-topic')) {
                const combinedTranscript = pendingTranscripts.join(' ')
                if (combinedTranscript.trim().length > 3) {
                  const payload: InboundGraphEvent = {
                    type: 'graph.node.upsert',
                    node: {
                      id: 'n-topic',
                      kind: 'topic',
                      label: combinedTranscript.slice(-140),
                      emphasis: 5
                    },
                    relayout: false,
                    version: 1,
                    eventId: 'ev-topic-' + Date.now(),
                    occurredAt: new Date().toISOString()
                  }
                  sendToClient(payload)
                }
              }

              // Fire full AI processing on non-final chunks in the first 5s too
              if (!event.is_final) {
                processAccumulatedTranscripts();
              }
            }
          }
        }
      } else if (event.type === 'utterance_end') {
        sendToClient({ type: 'utterance_end' })
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

  // --- AI Processing Timer ---
  const sessionStartTime = Date.now()
  let currentTimerInterval = 1000
  let aiTimer: NodeJS.Timeout | null = null

  function setupAiTimer() {
    if (destroyed) return
    const elapsedSeconds = (Date.now() - sessionStartTime) / 1000

    // Switch to 5s interval after 10s
    if (elapsedSeconds >= 10 && currentTimerInterval === 1000) {
      if (aiTimer) clearInterval(aiTimer)
      currentTimerInterval = 5000
      aiTimer = setInterval(timerTick, currentTimerInterval)
    } else if (!aiTimer) {
      aiTimer = setInterval(timerTick, currentTimerInterval)
    }
  }

  function timerTick() {
    processAccumulatedTranscripts()
    setupAiTimer() // Check if we need to adjust interval
  }

  setupAiTimer()

  // --- Graph Consolidation Timer (Claude Opus) ---
  let isConsolidating = false
  const consolidationTimer = setInterval(async () => {
    if (destroyed || isConsolidating) return
    const graphSnapshot = sessionManager.getGraphSnapshot(sessionId)

    // Only bother trying to consolidate if there are actual nodes to evaluate
    if (graphSnapshot.nodes.length < 3) return

    isConsolidating = true
    try {
      const fullTranscript = session?.conversationHistory
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ') || ''

      console.log(`[ai] Running 5s Graph Consolidation pass via AI (Nodes: ${graphSnapshot.nodes.length})`)
      const result = await aiService.consolidateGraph({ currentGraph: graphSnapshot, transcript: fullTranscript })

      if (destroyed) return

      if (result.graphEvents.length > 0) {
        console.log(`[ai] Consolidation removed/merged ${result.graphEvents.length} items`)
        for (const event of result.graphEvents) {
          sendToClient(event)
        }
        sessionManager.applyGraphEvents(sessionId, result.graphEvents)
      }

      if (result.debug) {
        sendToClient({ type: 'ai.debug', debug: result.debug })
      }
    } catch (e) {
      console.error('[ai] Cleanup pass failed:', e)
    } finally {
      isConsolidating = false
    }
  }, 5000)

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
        selectedNodeIds,
      })

      if (destroyed) return

      // Stream graph events to client
      for (const event of result.graphEvents) {
        console.log(`[ai] Sending event: ${event.type}`, 'node' in event ? (event as any).node : 'edge' in event ? (event as any).edge : '')
        sendToClient(event)
      }

      // Update server-side graph state
      sessionManager.applyGraphEvents(sessionId, result.graphEvents)

      // Send AI conversational response
      if (result.response) {
        sendToClient({ type: 'ai.response', text: result.response, debug: result.debug })
        sessionManager.addAssistantMessage(sessionId, result.response)
        console.log(`[ai] Response: "${result.response.slice(0, 120)}"`)
      } else if (result.debug) {
        // Send debug info even if there is no response
        sendToClient({ type: 'ai.debug', debug: result.debug })
      }

      console.log(
        `[ai] Done: ${result.graphEvents.length} events`,
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
  let audioChunks = 0
  ws.on('message', (data, isBinary) => {
    if (isBinary && !destroyed) {
      audioChunks++
      if (audioChunks === 1) console.log(`[ws] Receiving audio (first chunk: ${(data as Buffer).length} bytes)`)
      if (audioChunks % 50 === 0) console.log(`[ws] Audio chunks received: ${audioChunks}`)
      deepgram.sendAudio(data as Buffer)
    } else if (!isBinary && !destroyed) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'selection.update' && Array.isArray(msg.selectedNodeIds)) {
          selectedNodeIds = msg.selectedNodeIds
        }
      } catch {
        // Ignore malformed JSON
      }
    }
  })

  // --- Cleanup ---
  ws.on('close', () => {
    console.log(`[ws] Client disconnected from session ${sessionId}`)
    destroyed = true
    if (aiTimer) clearInterval(aiTimer)
    clearInterval(consolidationTimer)
    deepgram.disconnect()
  })

  ws.on('error', (err) => {
    console.error(`[ws] Error on session ${sessionId}:`, err.message)
    destroyed = true
    if (aiTimer) clearInterval(aiTimer)
    clearInterval(consolidationTimer)
    deepgram.disconnect()
  })
}

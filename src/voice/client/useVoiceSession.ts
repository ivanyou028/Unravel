import { useState, useCallback, useRef } from 'react'
import {
  WsSessionAdapter,
  type WsSessionAdapterCallbacks,
} from '#/features/realtime/ws-session-adapter'
import type { VoiceSessionStatus, VoiceSessionCallbacks } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const BUFFER_SIZE = 4096
const TARGET_SAMPLE_RATE = 16000

/** Downsample from browser's native sample rate to 16kHz for Deepgram. */
function downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer
  const ratio = fromRate / toRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.round(i * ratio)]
  }
  return result
}

/** Convert float32 PCM samples to int16 PCM (what Deepgram expects for linear16). */
function float32ToInt16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16.buffer
}

export function useVoiceSession(callbacks?: VoiceSessionCallbacks) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle')
  const sessionIdRef = useRef<string | null>(null)
  const adapterRef = useRef<WsSessionAdapter | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const updateStatus = useCallback(
    (newStatus: VoiceSessionStatus) => {
      setStatus(newStatus)
      callbacks?.onStatusChange?.(newStatus)
    },
    [callbacks],
  )

  const connect = useCallback(
    async (topic?: string) => {
      updateStatus('connecting')

      try {
        // 1. Create session via REST
        const res = await fetch(`${API_BASE}/api/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic }),
        })
        if (!res.ok) {
          throw new Error(`Failed to create session (${res.status})`)
        }
        const { sessionId } = await res.json()
        sessionIdRef.current = sessionId

        // 2. Create and connect WebSocket adapter
        const adapterCallbacks: WsSessionAdapterCallbacks = {
          onTranscript: (data) => {
            callbacks?.onEvent?.({
              type: 'transcript',
              timestamp: Date.now(),
              data: data as unknown as Record<string, unknown>,
            })
          },
          onAiResponse: (text) => {
            callbacks?.onEvent?.({
              type: 'agent_state_change',
              timestamp: Date.now(),
              data: { response: text },
            })
          },
          onAiDebug: (debug) => {
            callbacks?.onEvent?.({
              type: 'ai_debug',
              timestamp: Date.now(),
              data: { debug },
            })
          },
          onError: (message) => {
            callbacks?.onEvent?.({
              type: 'error',
              timestamp: Date.now(),
              data: { error: message },
            })
          },
        }

        const adapter = new WsSessionAdapter(sessionId, adapterCallbacks)
        adapterRef.current = adapter
        await adapter.connect()

        // 3. Get microphone and stream raw PCM via AudioContext
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
        streamRef.current = stream

        // Use browser's default sample rate and downsample to 16kHz
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const nativeRate = audioCtx.sampleRate
        console.log(`[voice] AudioContext sample rate: ${nativeRate}`)

        const source = audioCtx.createMediaStreamSource(stream)
        const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (e) => {
          const pcm = e.inputBuffer.getChannelData(0)
          const resampled = downsample(pcm, nativeRate, TARGET_SAMPLE_RATE)
          const int16buf = float32ToInt16(resampled)
          adapter.sendAudio(int16buf)
        }

        source.connect(processor)
        processor.connect(audioCtx.destination)

        updateStatus('connected')
      } catch (error) {
        callbacks?.onEvent?.({
          type: 'error',
          timestamp: Date.now(),
          data: { error: String(error) },
        })
        updateStatus('disconnected')
        throw error
      }
    },
    [updateStatus, callbacks],
  )

  const disconnect = useCallback(async () => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioCtxRef.current) {
      await audioCtxRef.current.close()
      audioCtxRef.current = null
    }

    // Close mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    // Disconnect WebSocket adapter
    if (adapterRef.current) {
      adapterRef.current.disconnect()
      adapterRef.current = null
    }

    // Delete session via REST
    if (sessionIdRef.current) {
      try {
        await fetch(`${API_BASE}/api/session/${sessionIdRef.current}`, {
          method: 'DELETE',
        })
      } catch {
        // Best-effort cleanup
      }
      sessionIdRef.current = null
    }

    updateStatus('disconnected')
  }, [updateStatus])

  /** Expose the adapter so parent components can subscribe to graph events */
  const getAdapter = useCallback(() => adapterRef.current, [])

  return {
    status,
    connect,
    disconnect,
    getAdapter,
  }
}

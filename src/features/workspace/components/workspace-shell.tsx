import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Mic } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { DevPanel } from '#/features/dev/components/dev-panel'
import { GraphCanvas } from '#/features/graph/components/graph-canvas'
import { useGraphStore } from '#/features/graph/store/graph-store'
import { ActivityPanel } from '#/features/activity/components/activity-panel'
import { useVoiceSession } from '#/voice/client/useVoiceSession'
import { WsSessionAdapter } from '#/features/realtime/ws-session-adapter'
import type { TranscriptData } from '#/features/realtime/ws-session-adapter'

export type CtaPreviewState =
  | 'centered-idle'
  | 'docked-idle'
  | 'docked-recording'

export interface TranscriptEntry {
  id: number
  text: string
  is_final: boolean
  timestamp: number
}

export interface AiResponseEntry {
  id: number
  text: string
  timestamp: number
}

export function WorkspaceShell() {
  const [ctaState, setCtaState] = useState<CtaPreviewState>('centered-idle')
  const isDocked = ctaState !== 'centered-idle'
  const isRecording = ctaState === 'docked-recording'

  // Transcript + AI response state for the activity panel
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [aiResponses, setAiResponses] = useState<AiResponseEntry[]>([])
  const [interimText, setInterimText] = useState('')
  const nextIdRef = useRef(0)

  const applyEvent = useGraphStore((state) => state.applyEvent)
  const setConnectionStatus = useGraphStore((state) => state.setConnectionStatus)

  const handleTranscript = useCallback((data: TranscriptData) => {
    if (data.is_final && data.transcript.trim()) {
      setTranscripts((prev) => [
        ...prev,
        {
          id: nextIdRef.current++,
          text: data.transcript,
          is_final: true,
          timestamp: Date.now(),
        },
      ])
      setInterimText('')
    } else if (!data.is_final) {
      setInterimText(data.transcript)
    }
  }, [])

  const handleAiResponse = useCallback((text: string) => {
    setAiResponses((prev) => [
      ...prev,
      {
        id: nextIdRef.current++,
        text,
        timestamp: Date.now(),
      },
    ])
  }, [])

  // Voice session hook
  const { status, connect, disconnect, getAdapter } = useVoiceSession({
    onEvent: (event) => {
      if (event.type === 'transcript' && event.data) {
        handleTranscript(event.data as TranscriptData)
      }
    },
    onStatusChange: (s) => {
      if (s === 'connected') setConnectionStatus('connected')
      else if (s === 'connecting') setConnectionStatus('connecting')
      else setConnectionStatus('unbound')
    },
  })

  // Subscribe the adapter to the graph store when connected
  useEffect(() => {
    const adapter = getAdapter()
    if (!adapter || status !== 'connected') return

    // Subscribe graph events → store
    const unsubGraph = adapter.subscribe(applyEvent)

    // Subscribe AI responses via a fresh adapter callback
    // We need to access the adapter's internal callbacks, so we
    // monkey-patch the onAiResponse callback
    const origCallbacks = (adapter as any).callbacks
    const origOnAiResponse = origCallbacks?.onAiResponse
    origCallbacks.onAiResponse = (text: string) => {
      origOnAiResponse?.(text)
      handleAiResponse(text)
    }

    return () => {
      unsubGraph()
      if (origCallbacks) {
        origCallbacks.onAiResponse = origOnAiResponse
      }
    }
  }, [status, getAdapter, applyEvent, handleAiResponse])

  const handleButtonClick = useCallback(async () => {
    if (ctaState === 'centered-idle') {
      // Start session
      setCtaState('docked-recording')
      try {
        await connect()
      } catch {
        setCtaState('centered-idle')
      }
      return
    }

    if (ctaState === 'docked-recording') {
      // Stop session
      setCtaState('docked-idle')
      await disconnect()
    } else {
      // Resume session
      setCtaState('docked-recording')
      try {
        await connect()
      } catch {
        setCtaState('docked-idle')
      }
    }
  }, [ctaState, connect, disconnect])

  return (
    <main id="main-content" className="relative min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <GraphCanvas className="h-screen rounded-none" />
      </motion.div>
      <DevPanel ctaState={ctaState} onCtaStateChange={setCtaState} />

      {/* Activity panel — slides in when recording */}
      {isDocked && (
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.2, 1, 0.3, 1] }}
          className="absolute bottom-20 right-4 z-20 w-[22rem] sm:right-6"
        >
          <ActivityPanel
            transcripts={transcripts}
            aiResponses={aiResponses}
            interimText={interimText}
            isRecording={isRecording}
          />
        </motion.div>
      )}

      <motion.div
        layout
        className={cn(
          'pointer-events-none absolute inset-0 flex justify-center px-6 sm:px-8',
          isDocked ? 'items-end pb-6 sm:pb-8' : 'items-center',
        )}
        transition={{
          layout: {
            duration: 0.72,
            ease: [0.2, 1, 0.3, 1],
          },
        }}
      >
        <motion.div
          layout
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.1,
            ease: [0.2, 1, 0.3, 1],
            layout: {
              duration: 0.72,
              ease: [0.2, 1, 0.3, 1],
            },
          }}
          className="pointer-events-auto"
        >
          <Button
            size="lg"
            onClick={handleButtonClick}
            aria-pressed={isRecording}
            className={cn(
              'h-10 rounded-full border-[rgba(162,78,43,0.24)] text-[0.82rem] font-medium tracking-[0.04em] shadow-[0_18px_34px_rgba(126,80,56,0.14)]',
              isRecording ? 'relative min-w-[12.5rem] justify-center px-5' : 'px-4.5',
            )}
          >
            {isRecording ? (
              <>
                <span aria-hidden="true" className="recording-leading recording-leading--absolute">
                  <span className="recording-dot" />
                </span>
                <Waveform />
                <span className="sr-only">listening</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="recording-leading">
                  <Mic />
                </span>
                {isDocked ? 'resume' : 'start yapping'}
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </main>
  )
}

function Waveform() {
  return (
    <span className="recording-wave" aria-hidden="true">
      {Array.from({ length: 11 }).map((_, index) => (
        <span
          key={index}
          className="recording-wave__bar"
          style={{ animationDelay: `${index * 95}ms` }}
        />
      ))}
    </span>
  )
}

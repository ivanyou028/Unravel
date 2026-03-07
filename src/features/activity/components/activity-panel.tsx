import { useEffect, useRef } from 'react'
import { Bot, RadioTower, ScrollText } from 'lucide-react'

import { ScrollArea } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'
import type {
  TranscriptEntry,
  AiResponseEntry,
} from '#/features/workspace/components/workspace-shell'

interface ActivityPanelProps {
  className?: string
  transcripts: TranscriptEntry[]
  aiResponses: AiResponseEntry[]
  interimText: string
  isRecording: boolean
}

type TimelineItem =
  | { kind: 'transcript'; entry: TranscriptEntry }
  | { kind: 'ai'; entry: AiResponseEntry }

export function ActivityPanel({
  className,
  transcripts,
  aiResponses,
  interimText,
  isRecording,
}: ActivityPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Build merged timeline sorted by timestamp
  const timeline: TimelineItem[] = [
    ...transcripts.map((t) => ({ kind: 'transcript' as const, entry: t })),
    ...aiResponses.map((a) => ({ kind: 'ai' as const, entry: a })),
  ].sort((a, b) => a.entry.timestamp - b.entry.timestamp)

  const hasContent = timeline.length > 0 || interimText

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [timeline.length, interimText])

  return (
    <aside className={className} aria-labelledby="activity-panel-heading">
      <div className="panel-surface flex max-h-[28rem] min-h-[10rem] flex-col rounded-[1.4rem]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-[var(--ink-dim)]" />
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--ink-dim)]">
              live activity
            </p>
          </div>
          {isRecording && (
            <span className="flex items-center gap-1.5">
              <span className="recording-dot size-2" />
              <span className="text-[0.68rem] font-medium text-[var(--signal)]">
                listening
              </span>
            </span>
          )}
        </div>
        <Separator />
        <ScrollArea className="activity-scroll min-h-0 flex-1 px-4 py-3" ref={scrollRef}>
          {hasContent ? (
            <div className="space-y-2.5">
              {timeline.map((item) =>
                item.kind === 'transcript' ? (
                  <div key={`t-${item.entry.id}`} className="text-sm leading-6 text-[var(--ink)]">
                    {item.entry.text}
                  </div>
                ) : (
                  <div
                    key={`a-${item.entry.id}`}
                    className="flex gap-2 rounded-xl bg-[rgba(217,75,43,0.06)] px-3 py-2.5"
                  >
                    <Bot className="mt-0.5 size-4 shrink-0 text-[var(--signal)]" />
                    <p className="text-sm leading-6 text-[var(--ink)]">{item.entry.text}</p>
                  </div>
                ),
              )}
              {interimText && (
                <div className="text-sm leading-6 text-[var(--ink-dim)] italic">
                  {interimText}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <RadioTower className="mb-2 size-5 text-[var(--ink-dim)]" />
              <p className="text-sm text-[var(--ink-soft)]">
                Start talking — your words will appear here.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  )
}

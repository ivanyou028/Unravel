import { FlaskConical, LayoutTemplate, RadioTower, Workflow } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { sampleDevEdges, sampleDevNodes } from '#/features/dev/sample-graph'
import { useGraphStore } from '#/features/graph/store/graph-store'
import type { GraphLayoutDirection } from '#/features/graph/types/graph'
import type { CtaPreviewState } from '#/features/workspace/components/workspace-shell'

interface DevPanelProps {
  ctaState: CtaPreviewState
  onCtaStateChange: (state: CtaPreviewState) => void
}

export function DevPanel({ ctaState, onCtaStateChange }: DevPanelProps) {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const layoutDirection = useGraphStore((state) => state.layoutDirection)
  const replaceGraph = useGraphStore((state) => state.replaceGraph)
  const triggerLayout = useGraphStore((state) => state.triggerLayout)
  const reset = useGraphStore((state) => state.reset)

  const sampleEnabled = nodes.some((node) =>
    sampleDevNodes.some((sampleNode) => sampleNode.id === node.id),
  )

  return (
    <aside className="pointer-events-auto absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
      <div className="panel-surface w-[17.5rem] rounded-[1.1rem] p-3">
        <div className="mb-4 flex items-start gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--line)] bg-white/35 text-[var(--ink-soft)]">
            <FlaskConical className="size-4" />
          </span>
          <div>
            <p className="eyebrow mb-1">dev panel</p>
            <p className="text-sm leading-5 text-[var(--ink-soft)]">
              Preview design states without live APIs.
            </p>
          </div>
        </div>

        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Workflow className="size-4 text-[var(--ink-dim)]" />
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--ink-dim)]">
              Canvas data
            </p>
          </div>
          <button
            type="button"
            aria-pressed={sampleEnabled}
            onClick={() => {
              if (sampleEnabled) {
                reset()
                return
              }

              replaceGraph(sampleDevNodes, sampleDevEdges, {
                direction: layoutDirection,
              })
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-[0.9rem] border px-3 py-2.5 text-left transition-colors',
              sampleEnabled
                ? 'border-[rgba(162,78,43,0.28)] bg-[rgba(217,75,43,0.08)]'
                : 'border-[var(--line)] bg-white/20 hover:bg-white/35',
            )}
          >
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Sample graph</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-dim)]">
                Toggle placeholder nodes and edges.
              </p>
            </div>
            <span
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors',
                sampleEnabled
                  ? 'border-[rgba(162,78,43,0.22)] bg-[var(--signal)]'
                  : 'border-[var(--line-strong)] bg-[rgba(35,29,25,0.08)]',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-5 translate-x-0.5 rounded-full bg-[var(--paper-strong)] shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform',
                  sampleEnabled && 'translate-x-[1.4rem]',
                )}
              />
            </span>
          </button>
          <p className="mt-2 font-mono text-[0.68rem] text-[var(--ink-dim)]">
            {nodes.length} nodes / {edges.length} edges
          </p>
        </section>

        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <LayoutTemplate className="size-4 text-[var(--ink-dim)]" />
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--ink-dim)]">
              Graph layout
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LayoutButton
              active={layoutDirection === 'TB'}
              label="Vertical"
              onClick={() => applyLayout(triggerLayout, 'TB')}
            />
            <LayoutButton
              active={layoutDirection === 'LR'}
              label="Horizontal"
              onClick={() => applyLayout(triggerLayout, 'LR')}
            />
          </div>
        </section>

        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <RadioTower className="size-4 text-[var(--ink-dim)]" />
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--ink-dim)]">
              CTA preview
            </p>
          </div>
          <div className="grid gap-2">
            <PreviewButton
              active={ctaState === 'centered-idle'}
              label="Centered idle"
              description="Default launch state."
              onClick={() => onCtaStateChange('centered-idle')}
            />
            <PreviewButton
              active={ctaState === 'docked-idle'}
              label="Docked idle"
              description="Button anchored at bottom, not listening."
              onClick={() => onCtaStateChange('docked-idle')}
            />
            <PreviewButton
              active={ctaState === 'docked-recording'}
              label="Docked recording"
              description="Green dot and waveform active."
              onClick={() => onCtaStateChange('docked-recording')}
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reset()}
            className="w-full justify-center"
          >
            clear canvas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              replaceGraph(sampleDevNodes, sampleDevEdges, {
                direction: layoutDirection,
              })
            }}
            className="w-full justify-center"
          >
            reload sample
          </Button>
        </div>
      </div>
    </aside>
  )
}

function LayoutButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[0.85rem] border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-[rgba(162,78,43,0.28)] bg-[rgba(217,75,43,0.08)] text-[var(--ink)]'
          : 'border-[var(--line)] bg-white/20 text-[var(--ink-soft)] hover:bg-white/35',
      )}
    >
      {label}
    </button>
  )
}

function PreviewButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[0.9rem] border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[rgba(162,78,43,0.28)] bg-[rgba(217,75,43,0.08)]'
          : 'border-[var(--line)] bg-white/20 hover:bg-white/35',
      )}
    >
      <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--ink-dim)]">
        {description}
      </p>
    </button>
  )
}

function applyLayout(
  triggerLayout: (direction?: GraphLayoutDirection) => void,
  direction: GraphLayoutDirection,
) {
  triggerLayout(direction)
}

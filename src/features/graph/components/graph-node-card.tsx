import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '#/lib/utils'
import type { GraphNode } from '#/features/graph/types/graph'

export function GraphNodeCard({
  data,
  selected,
  sourcePosition,
  targetPosition,
}: NodeProps<GraphNode>) {
  return (
    <>
      <Handle
        type="target"
        position={targetPosition ?? Position.Top}
        className="!invisible !absolute !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-0 !h-0 !min-w-0 !min-h-0 !border-0"
      />
      <Handle
        type="source"
        position={sourcePosition ?? Position.Bottom}
        className="!invisible !absolute !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-0 !h-0 !min-w-0 !min-h-0 !border-0"
      />
      <article
        className={cn(
          'w-[min(280px,72vw)] rounded-2xl border border-[var(--node-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.56),transparent_22%),linear-gradient(180deg,var(--node-paper-strong),var(--node-paper))] px-4 py-3.5 text-left shadow-[0_18px_32px_rgba(92,102,154,0.12),0_2px_0_rgba(255,255,255,0.8)_inset,0_-1px_0_rgba(92,102,154,0.08)_inset] transition-all duration-300',
          selected
            ? 'node-selected -translate-y-1 ring-[4px] ring-[rgba(124,100,212,0.5)] ring-offset-2 ring-offset-transparent shadow-[0_24px_48px_rgba(92,102,154,0.18),0_2px_0_rgba(255,255,255,0.82)_inset]'
            : 'hover:-translate-y-0.5',
        )}
      >
        <h3 className="text-[0.95rem] leading-snug font-semibold text-[var(--ink)]">
          {data.label}
        </h3>

        {data.summary && (
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
            {data.summary}
          </p>
        )}
      </article>
    </>
  )
}

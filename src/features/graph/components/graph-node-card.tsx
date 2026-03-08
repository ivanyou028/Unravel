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
    <article
      className={cn(
        'w-[min(280px,72vw)] rounded-2xl border border-[var(--node-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.56),transparent_22%),linear-gradient(180deg,var(--node-paper-strong),var(--node-paper))] px-4 py-3.5 text-left shadow-[0_18px_32px_rgba(92,102,154,0.12),0_2px_0_rgba(255,255,255,0.8)_inset,0_-1px_0_rgba(92,102,154,0.08)_inset] transition-transform duration-300',
        selected
          ? 'scale-[1.01] border-[color:var(--node-accent)] shadow-[0_0_0_1px_var(--node-accent),0_22px_44px_rgba(73,61,52,0.1),0_2px_0_rgba(255,255,255,0.82)_inset]'
          : 'hover:-translate-y-0.5',
      )}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Top}
        className="!border-[var(--node-line-strong)] !bg-[var(--node-paper-strong)]"
      />
      <Handle
        type="source"
        position={sourcePosition ?? Position.Bottom}
        className="!border-[var(--node-line-strong)] !bg-[var(--node-paper-strong)]"
      />

      <h3 className="text-[0.95rem] leading-snug font-semibold text-[var(--ink)]">
        {data.label}
      </h3>

      {data.summary && (
        <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
          {data.summary}
        </p>
      )}
    </article>
  )
}

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import type { GraphNode, GraphNodeData } from '#/features/graph/types/graph'

interface GraphNodeCardProps extends NodeProps<GraphNode> {
  icon: LucideIcon
  tone: string
  label: string
  data: GraphNodeData
}

export function GraphNodeCard({
  data,
  selected,
  sourcePosition,
  targetPosition,
  icon: Icon,
  tone,
  label,
}: GraphNodeCardProps) {
  return (
    <article
      className={cn(
        'w-[min(300px,72vw)] rounded-[1.2rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.46),transparent_20%),linear-gradient(180deg,var(--paper-strong),var(--paper))] p-4 text-left shadow-[0_18px_32px_rgba(73,61,52,0.08),0_2px_0_rgba(255,255,255,0.75)_inset,0_-1px_0_rgba(73,61,52,0.06)_inset] transition-transform duration-300',
        selected
          ? 'scale-[1.01] border-[color:var(--node-accent)] shadow-[0_0_0_1px_var(--node-accent),0_22px_44px_rgba(73,61,52,0.1),0_2px_0_rgba(255,255,255,0.82)_inset]'
          : 'hover:-translate-y-0.5',
      )}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Top}
        className="!border-[var(--line-strong)] !bg-[var(--paper-strong)]"
      />
      <Handle
        type="source"
        position={sourcePosition ?? Position.Bottom}
        className="!border-[var(--line-strong)] !bg-[var(--paper-strong)]"
      />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{label}</p>
          <h3 className="display-title text-[1.3rem] leading-tight font-semibold text-[var(--ink)]">
            {data.label}
          </h3>
        </div>
        <span
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/35"
          style={{ color: tone }}
        >
          <Icon />
        </span>
      </div>
      <p className="min-h-12 text-sm leading-6 text-[var(--ink-soft)]">
        {data.summary ??
          'Waiting for a structured delta from the voice pipeline.'}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="rounded-full border border-[var(--line)] px-3 py-1 font-mono text-[0.66rem] tracking-[0.16em] uppercase"
          style={{
            backgroundColor:
              'color-mix(in oklab, var(--node-accent) 10%, white 90%)',
            color: tone,
          }}
        >
          {data.kind}
        </span>
        <span className="font-mono text-xs text-[var(--ink-dim)]">
          emphasis {data.emphasis ?? 3}/5
        </span>
      </div>
    </article>
  )
}

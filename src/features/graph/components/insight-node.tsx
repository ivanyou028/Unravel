import type { NodeProps } from '@xyflow/react'

import { GraphNodeCard } from '#/features/graph/components/graph-node-card'
import type { GraphNode } from '#/features/graph/types/graph'

export function InsightNode(props: NodeProps<GraphNode>) {
  return <GraphNodeCard {...props} />
}

import type {
  GraphEdgeRecord,
  GraphNodeRecord,
} from '#/features/graph/types/graph'

export const sampleDevNodes: GraphNodeRecord[] = [
  {
    id: 'idea-voice-journal',
    kind: 'idea',
    label: 'voice journal for messy thinking',
    summary:
      'Capture raw thought fragments first, then let structure emerge after the user keeps talking.',
    emphasis: 5,
  },
  {
    id: 'category-capture',
    kind: 'category',
    label: 'capture flow',
    summary:
      'A thin input ritual that feels immediate, private, and frictionless.',
    emphasis: 3,
  },
  {
    id: 'category-graph',
    kind: 'category',
    label: 'graph behavior',
    summary:
      'Relationships should clarify themselves while the canvas rebalances in place.',
    emphasis: 4,
  },
  {
    id: 'idea-live-deltas',
    kind: 'idea',
    label: 'stream live deltas from speech',
    summary:
      'Nodes appear mid-sentence, merge when repeated, and collapse when the thought resolves.',
    emphasis: 4,
  },
  {
    id: 'insight-calm-ui',
    kind: 'insight',
    label: 'calm interface makes chaos feel manageable',
    summary:
      'The graph can be active while the surrounding visual language stays quiet and grounded.',
    emphasis: 5,
  },
  {
    id: 'idea-memory',
    kind: 'idea',
    label: 'build long-term memory clusters',
    summary:
      'Recurring concepts should connect across sessions instead of living in isolated dumps.',
    emphasis: 3,
  },
  {
    id: 'insight-review',
    kind: 'insight',
    label: 'review mode should surface what changed',
    summary:
      'People need to see what the system learned from their ramble, not just the final graph.',
    emphasis: 4,
  },
]

export const sampleDevEdges: GraphEdgeRecord[] = [
  {
    id: 'edge-capture-live',
    source: 'category-capture',
    target: 'idea-live-deltas',
    kind: 'hierarchy',
  },
  {
    id: 'edge-live-graph',
    source: 'idea-live-deltas',
    target: 'category-graph',
    kind: 'association',
  },
  {
    id: 'edge-voice-capture',
    source: 'idea-voice-journal',
    target: 'category-capture',
    kind: 'association',
  },
  {
    id: 'edge-graph-calm',
    source: 'category-graph',
    target: 'insight-calm-ui',
    kind: 'reference',
  },
  {
    id: 'edge-memory-graph',
    source: 'idea-memory',
    target: 'category-graph',
    kind: 'association',
  },
  {
    id: 'edge-calm-review',
    source: 'insight-calm-ui',
    target: 'insight-review',
    kind: 'reference',
  },
]

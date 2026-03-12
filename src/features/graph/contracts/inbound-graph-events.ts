import { z } from 'zod'

import {
  graphLayoutDirections,
  type GraphLayoutDirection,
} from '#/features/graph/types/graph'

const layoutDirectionSchema = z.enum(graphLayoutDirections)

const graphNodeRecordSchema = z
  .object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1).max(140),
    summary: z.string().max(280).optional(),
    emphasis: z
      .union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ])
      .optional(),
  })
  .strict()

const graphEdgeRecordSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().max(120).optional(),
  })
  .strict()

const positionHintSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict()

const eventEnvelopeSchema = z
  .object({
    version: z.literal(1),
    eventId: z.string().min(1),
    occurredAt: z.string().datetime(),
  })
  .strict()

export const graphNodeUpsertEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.node.upsert'),
  node: graphNodeRecordSchema,
  positionHint: positionHintSchema.optional(),
  relayout: z.boolean().optional(),
})

export const graphNodeRemoveEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.node.remove'),
  nodeId: z.string().min(1),
  relayout: z.boolean().optional(),
})

export const graphEdgeUpsertEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.edge.upsert'),
  edge: graphEdgeRecordSchema,
  relayout: z.boolean().optional(),
})

export const graphEdgeRemoveEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.edge.remove'),
  edgeId: z.string().min(1),
  relayout: z.boolean().optional(),
})

export const graphLayoutEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.layout'),
  direction: layoutDirectionSchema.optional(),
})

export const graphResetEventSchema = eventEnvelopeSchema.extend({
  type: z.literal('graph.reset'),
})

export const inboundGraphEventSchema = z.discriminatedUnion('type', [
  graphNodeUpsertEventSchema,
  graphNodeRemoveEventSchema,
  graphEdgeUpsertEventSchema,
  graphEdgeRemoveEventSchema,
  graphLayoutEventSchema,
  graphResetEventSchema,
])

export type InboundGraphEvent = z.infer<typeof inboundGraphEventSchema>
export type InboundLayoutDirection = GraphLayoutDirection

import '@xyflow/react/dist/style.css'

import { useCallback, useEffect, useState } from 'react'
import { ReactFlow, ReactFlowProvider, useReactFlow, type OnSelectionChangeFunc } from '@xyflow/react'

import { cn } from '#/lib/utils'
import { GraphNodeCard } from '#/features/graph/components/graph-node-card'
import { useGraphStore } from '#/features/graph/store/graph-store'

const nodeTypes = {
  default: GraphNodeCard,
}

interface GraphCanvasProps {
  className?: string
}

export function GraphCanvas({ className }: GraphCanvasProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div
      className={cn(
        'orb-glow-canvas relative isolate h-full min-h-[24rem] overflow-hidden',
        className,
      )}
    >
      {isClient ? (
        <ReactFlowProvider>
          <GraphCanvasInner />
        </ReactFlowProvider>
      ) : (
        <CanvasFallback />
      )}
    </div>
  )
}

function GraphCanvasInner() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const onNodesChange = useGraphStore((state) => state.onNodesChange)
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange)
  const setSelectedNodeIds = useGraphStore((state) => state.setSelectedNodeIds)
  const lastEventAt = useGraphStore((state) => state.lastEventAt)
  const reactFlow = useReactFlow()

  const onSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: selectedNodes }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id))
    },
    [setSelectedNodeIds],
  )

  useEffect(() => {
    if (!lastEventAt || nodes.length === 0) {
      return
    }

    void reactFlow.fitView({
      duration: 450,
      padding: 0.18,
    })
  }, [lastEventAt, nodes.length, reactFlow])

  return (
    <ReactFlow
      className="orb-glow-flow"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={onSelectionChange}
      fitView
      minZoom={0.35}
      maxZoom={1.8}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      nodesDraggable
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'default',
      }}
    />
  )
}

function CanvasFallback() {
  return <div className="absolute inset-0" />
}

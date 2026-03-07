import '@xyflow/react/dist/style.css'

import { useEffect, useState } from 'react'
import { ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'

import { cn } from '#/lib/utils'
import { CategoryNode } from '#/features/graph/components/category-node'
import { IdeaNode } from '#/features/graph/components/idea-node'
import { InsightNode } from '#/features/graph/components/insight-node'
import { useGraphStore } from '#/features/graph/store/graph-store'

const nodeTypes = {
  idea: IdeaNode,
  category: CategoryNode,
  insight: InsightNode,
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
        'relative h-full min-h-[24rem] overflow-hidden rounded-[1.8rem]',
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
  const lastEventAt = useGraphStore((state) => state.lastEventAt)
  const reactFlow = useReactFlow()

  useEffect(() => {
    if (!lastEventAt || nodes.length === 0) {
      return
    }

    console.log('[graph] Nodes after layout:', nodes.map(n => ({ id: n.id, pos: n.position })))

    void reactFlow.fitView({
      duration: 450,
      padding: 0.18,
    })
  }, [lastEventAt, nodes.length, reactFlow])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      minZoom={0.35}
      maxZoom={1.8}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      nodesDraggable
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'smoothstep',
      }}
    />
  )
}

function CanvasFallback() {
  return <div className="absolute inset-0" />
}

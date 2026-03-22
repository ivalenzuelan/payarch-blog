import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DiagramDefinition, PayarchNode, PayarchEdge } from '@payarch/core';

interface Props {
  diagram: DiagramDefinition;
  defaultLayer?: 'business' | 'technical' | 'iso8583';
  autoPlay?: boolean;
}

// Custom Edge to support animation and labels cleanly
const PayarchCustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#fff',
              padding: '2px 4px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Generic Node wrapper that reads the current active step and layer
const PayarchGenericNode = ({ data }: { data: any }) => {
  const { nodeData, currentStepId, currentLayer } = data;
  
  // Find the step metadata for the current step
  const stepInfo = nodeData.steps?.[currentStepId];
  const isActive = stepInfo?.active || false;
  
  // Get the appropriate layer text
  const layerText = stepInfo?.layerText?.[currentLayer as keyof typeof stepInfo.layerText] || '';

  return (
    <div className={`p-4 rounded-xl border-2 bg-white shadow-lg transition-all duration-300 w-64 ${isActive ? 'border-blue-500 scale-105' : 'border-gray-200 opacity-60'}`}>
      <div className="font-bold text-gray-800 text-lg mb-2 flex justify-between items-center">
        {nodeData.label}
        {isActive && <span className="animate-pulse h-3 w-3 bg-blue-500 rounded-full"></span>}
      </div>
      
      {/* Dynamic text based on layer */}
      <div className="min-h-[60px] text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100">
        {layerText ? (
          <p>{layerText}</p>
        ) : (
          <p className="italic text-gray-400">Idle</p>
        )}
      </div>

      {/* Balance info specific for AgentWallet */}
      {nodeData.balances && (
        <div className="mt-3 pt-2 border-t border-gray-100 text-xs font-mono text-gray-500">
          Balance: {Object.entries(nodeData.balances as Record<string, number>).map(([k, v]) => `${v} ${k}`).join(', ')}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  AgentWallet: PayarchGenericNode,
  VisaNetwork: PayarchGenericNode,
};

const edgeTypes = {
  payarchTemplate: PayarchCustomEdge,
};

export default function PayarchDiagram({ diagram, defaultLayer = 'technical', autoPlay = false }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [layer, setLayer] = useState<'business' | 'technical' | 'iso8583'>(defaultLayer);

  const currentStepId = diagram.stepsOrder[currentStepIndex];

  // Map core nodes to React Flow nodes, injecting the current state
  const nodes = diagram.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { nodeData: n.data, currentStepId, currentLayer: layer }
  }));

  // Map core edges to React Flow edges
  const edges = diagram.edges.map((e) => {
    // Check if edge is active in the current step (just a visual feature, if the active node outputs this edge)
    // We can infer this based on who is active, or we could have explicit edge steps in the future
    const isAnimated = e.animated && autoPlay; // Simplify for now

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'payarchTemplate',
      animated: isAnimated,
      label: e.label,
      style: { strokeWidth: 2, stroke: isAnimated ? '#3b82f6' : '#cbd5e1' },
      markerEnd: { type: MarkerType.ArrowClosed, color: isAnimated ? '#3b82f6' : '#cbd5e1' }
    };
  });

  // AutoPlay logic
  useEffect(() => {
    if (!autoPlay || diagram.stepsOrder.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % diagram.stepsOrder.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [autoPlay, diagram.stepsOrder.length]);

  return (
    <div className="flex flex-col gap-4 my-8 p-4 border rounded-xl bg-gray-50">
      
      {/* Controls Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-sans text-gray-800">{diagram.title}</h3>
        
        {/* Layer Selector */}
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          {(['business', 'technical', 'iso8583'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors ${layer === l ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Timeline explicit controls */}
      <div className="flex justify-center flex-wrap gap-2 mt-2">
        {diagram.stepsOrder.map((stepId, idx) => (
          <button
            key={stepId}
            onClick={() => {
              setCurrentStepIndex(idx);
            }}
            className={`px-4 py-2 text-sm rounded-full transition-all ${idx === currentStepIndex ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}
          >
            Step {idx + 1}: {stepId}
          </button>
        ))}
      </div>
    </div>
  );
}

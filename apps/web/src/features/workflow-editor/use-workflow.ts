import { useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { CanvasEngine } from './canvas-engine';
import type { Connection } from 'reactflow';

export const useWorkflow = () => {
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = useWorkflowStore();

  const addNode = useCallback((type: string, position: { x: number, y: number }) => {
    const newNode = CanvasEngine.createNode(type, position);
    setNodes([...nodes, newNode]);
  }, [nodes, setNodes]);

  const onConnect = useCallback((params: Connection) => {
    if (CanvasEngine.validateConnection(params)) {
      setEdges(CanvasEngine.onConnect(params, edges));
    }
  }, [edges, setEdges]);

  return {
    nodes,
    edges,
    addNode,
    onConnect,
    onNodesChange,
    onEdgesChange,
  };
};

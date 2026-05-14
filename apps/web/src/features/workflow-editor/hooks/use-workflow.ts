import { useCallback, useRef, useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { CanvasEngine } from '../utils/canvas-engine';
import { type Connection, useReactFlow } from 'reactflow';

export const useWorkflow = () => {
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [mode, setMode] = useState<'select' | 'pan'>('select');

  const addNode = useCallback((type: string, position: { x: number, y: number }) => {
    const newNode = CanvasEngine.createNode(type, position);
    setNodes([...nodes, newNode]);
  }, [nodes, setNodes]);

  const onConnect = useCallback((params: Connection) => {
    if (CanvasEngine.validateConnection(params)) {
      setEdges(CanvasEngine.onConnect(params, edges));
    }
  }, [edges, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  return {
    nodes,
    edges,
    addNode,
    onConnect,
    onNodesChange,
    onEdgesChange,
    onDragOver,
    onDrop,
    reactFlowWrapper,
    mode,
    setMode,
  };
};

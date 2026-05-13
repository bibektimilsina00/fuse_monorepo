import { Node, Edge, Connection, addEdge } from 'reactflow';
import { useWorkflowStore } from './stores/workflowStore';

export class CanvasEngine {
  static onConnect(params: Connection, edges: Edge[]): Edge[] {
    return addEdge({ ...params, animated: true }, edges);
  }

  static createNode(type: string, position: { x: number, y: number }): Node {
    return {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { 
        label: type,
        properties: {},
      },
    };
  }

  static validateConnection(connection: Connection, nodes: Node[]): boolean {
    // Basic cycle detection or port validation
    return connection.source !== connection.target;
  }
}

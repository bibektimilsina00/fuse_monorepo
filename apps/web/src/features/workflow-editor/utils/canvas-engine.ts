import { addEdge } from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';

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

  static validateConnection(connection: Connection): boolean {
    // Basic cycle detection or port validation
    return connection.source !== connection.target;
  }
}

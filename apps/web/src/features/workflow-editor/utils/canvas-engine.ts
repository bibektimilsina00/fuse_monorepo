import { addEdge } from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';

export class CanvasEngine {
  static onConnect(params: Connection, edges: Edge[]): Edge[] {
    const isError = params.sourceHandle === 'error';
    return addEdge({
      ...params,
      type: 'smoothstep',
      animated: false,
      style: isError
        ? { stroke: '#ff4d4f', strokeWidth: 2 }
        : { stroke: 'var(--workflow-edge, #555)', strokeWidth: 2 },
    } as any, edges);
  }

  static createNode(type: string, position: { x: number, y: number }, definition?: any): Node {
    const properties: Record<string, any> = {};

    if (definition) {
      definition.properties.forEach((prop: any) => {
        if (prop.default !== undefined) {
          properties[prop.name] = prop.default;
        }
      });
    }

    return {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        label: '',
        properties,
      },
    };
  }

  static validateConnection(connection: Connection): boolean {
    // Basic cycle detection or port validation
    return connection.source !== connection.target;
  }
}

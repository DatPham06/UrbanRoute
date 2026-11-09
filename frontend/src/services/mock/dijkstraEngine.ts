import type { RoadEdge, RoadNode, RouteCoordinate, RouteResponse } from '../../types/index.ts';
import { calculateHaversineDistanceMeters } from '../../utils/validators.ts';
import { MOCK_ROAD_EDGES, MOCK_ROAD_NODES } from './mockData.ts';

interface GraphNode {
  id: number;
  name: string;
  lat: number;
  lng: number;
  neighbors: Map<number, { distanceM: number; edgeId: number; roadName: string }>;
}

export class DijkstraRouter {
  private nodes: Map<number, GraphNode> = new Map();

  constructor(roadNodes: RoadNode[] = MOCK_ROAD_NODES, roadEdges: RoadEdge[] = MOCK_ROAD_EDGES) {
    this.buildGraph(roadNodes, roadEdges);
  }

  private buildGraph(nodes: RoadNode[], edges: RoadEdge[]) {
    this.nodes.clear();
    for (const n of nodes) {
      this.nodes.set(n.nodeId, {
        id: n.nodeId,
        name: n.nodeName,
        lat: n.latitude,
        lng: n.longitude,
        neighbors: new Map(),
      });
    }

    for (const e of edges) {
      const src = this.nodes.get(e.sourceNodeId);
      const tgt = this.nodes.get(e.targetNodeId);
      if (src && tgt) {
        src.neighbors.set(e.targetNodeId, {
          distanceM: e.lengthM,
          edgeId: e.edgeId,
          roadName: e.roadName,
        });
      }
    }
  }

  /**
   * Finds the nearest road node to a given GPS coordinate
   */
  public findNearestNode(lat: number, lng: number, maxDistanceMeters: number = 5000): { node: GraphNode; distanceM: number } | null {
    let nearest: GraphNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const dist = calculateHaversineDistanceMeters(lat, lng, node.lat, node.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }

    if (nearest && minDistance <= maxDistanceMeters) {
      return { node: nearest, distanceM: minDistance };
    }
    return null;
  }

  /**
   * Executes Dijkstra shortest path calculation from sourceNodeId to targetNodeId
   */
  public computeShortestPath(startNodeId: number, targetNodeId: number): {
    pathNodeIds: number[];
    distanceMeters: number;
    coordinates: RouteCoordinate[];
  } | null {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(targetNodeId)) {
      return null;
    }

    if (startNodeId === targetNodeId) {
      const node = this.nodes.get(startNodeId)!;
      return {
        pathNodeIds: [startNodeId],
        distanceMeters: 0,
        coordinates: [{ latitude: node.lat, longitude: node.lng, nodeId: node.id, nodeName: node.name }],
      };
    }

    const distances = new Map<number, number>();
    const previous = new Map<number, number>();
    const unvisited = new Set<number>();

    for (const id of this.nodes.keys()) {
      distances.set(id, Infinity);
      unvisited.add(id);
    }
    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentId: number | null = null;
      let minDistance = Infinity;

      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDistance) {
          minDistance = d;
          currentId = id;
        }
      }

      if (currentId === null || minDistance === Infinity) {
        break; // No reachable remaining nodes
      }

      if (currentId === targetNodeId) {
        break; // Target reached
      }

      unvisited.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;

      for (const [neighborId, edge] of currentNode.neighbors) {
        if (!unvisited.has(neighborId)) continue;

        const alt = distances.get(currentId)! + edge.distanceM;
        if (alt < distances.get(neighborId)!) {
          distances.set(neighborId, alt);
          previous.set(neighborId, currentId);
        }
      }
    }

    // Check if target was reached
    if (distances.get(targetNodeId) === Infinity) {
      return null; // No path
    }

    // Reconstruct path
    const pathNodeIds: number[] = [];
    let curr: number | undefined = targetNodeId;
    while (curr !== undefined) {
      pathNodeIds.unshift(curr);
      curr = previous.get(curr);
    }

    const coordinates: RouteCoordinate[] = pathNodeIds.map((id) => {
      const n = this.nodes.get(id)!;
      return {
        latitude: n.lat,
        longitude: n.lng,
        nodeId: n.id,
        nodeName: n.name,
      };
    });

    return {
      pathNodeIds,
      distanceMeters: distances.get(targetNodeId)!,
      coordinates,
    };
  }
}

export const mockDijkstraRouter = new DijkstraRouter();

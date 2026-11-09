import {
  DashboardStats,
  DeliveryPoint,
  HistoryRecord,
  RouteResponse,
  RouteSearchPayload,
  SearchesByDate,
  TopDestination,
} from '../../types/index.ts';
import { mockDijkstraRouter } from './dijkstraEngine.ts';
import { INITIAL_DELIVERY_POINTS, INITIAL_HISTORY } from './mockData.ts';
import { fetchRoadSnappedCoordinates } from '../api/routeGeometryHelper.ts';

const STORAGE_KEY_POINTS = 'urbanroute_delivery_points_v1';
const STORAGE_KEY_HISTORY = 'urbanroute_history_v1';

class MockStorageService {
  private getPointsFromStorage(): DeliveryPoint[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_POINTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback to in-memory if localStorage unavailable
    }
    this.savePointsToStorage(INITIAL_DELIVERY_POINTS);
    return [...INITIAL_DELIVERY_POINTS];
  }

  private savePointsToStorage(points: DeliveryPoint[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(points));
    } catch {
      // Ignore in private browsing
    }
  }

  private getHistoryFromStorage(): HistoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    this.saveHistoryToStorage(INITIAL_HISTORY);
    return [...INITIAL_HISTORY];
  }

  private saveHistoryToStorage(history: HistoryRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {
      // Ignore
    }
  }

  public resetMockData(): void {
    localStorage.removeItem(STORAGE_KEY_POINTS);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  }

  // --- Delivery Points ---

  public getDeliveryPoints(activeOnly: boolean = false): DeliveryPoint[] {
    const points = this.getPointsFromStorage();
    if (activeOnly) {
      return points.filter((p) => p.isActive);
    }
    return points;
  }

  public getDeliveryPointById(id: number): DeliveryPoint | null {
    const points = this.getPointsFromStorage();
    return points.find((p) => p.pointId === id) || null;
  }

  public createDeliveryPoint(point: Omit<DeliveryPoint, 'pointId' | 'createdAt'>): DeliveryPoint {
    const points = this.getPointsFromStorage();
    const newId = points.length > 0 ? Math.max(...points.map((p) => p.pointId)) + 1 : 1;

    // Nearest road node resolution
    const nearest = mockDijkstraRouter.findNearestNode(point.latitude, point.longitude);

    const newPoint: DeliveryPoint = {
      ...point,
      pointId: newId,
      nodeId: nearest ? nearest.node.id : null,
      createdAt: new Date().toISOString(),
    };

    points.unshift(newPoint);
    this.savePointsToStorage(points);
    return newPoint;
  }

  public updateDeliveryPoint(id: number, updates: Partial<DeliveryPoint>): DeliveryPoint {
    const points = this.getPointsFromStorage();
    const index = points.findIndex((p) => p.pointId === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy địa điểm với mã ${id}`);
    }

    const current = points[index];
    const updated: DeliveryPoint = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      const lat = updates.latitude ?? current.latitude;
      const lng = updates.longitude ?? current.longitude;
      const nearest = mockDijkstraRouter.findNearestNode(lat, lng);
      updated.nodeId = nearest ? nearest.node.id : current.nodeId;
    }

    points[index] = updated;
    this.savePointsToStorage(points);
    return updated;
  }

  public togglePointStatus(id: number, isActive: boolean): DeliveryPoint {
    return this.updateDeliveryPoint(id, { isActive });
  }

  public deleteDeliveryPoint(id: number): boolean {
    // Soft delete: sets isActive to false as per project specifications
    const points = this.getPointsFromStorage();
    const index = points.findIndex((p) => p.pointId === id);
    if (index === -1) return false;

    points[index].isActive = false;
    points[index].updatedAt = new Date().toISOString();
    this.savePointsToStorage(points);
    return true;
  }

  // --- Routing & History ---

  public async computeShortestRoute(
    payload: RouteSearchPayload,
    driverId: number = 2,
    driverUsername: string = 'driver'
  ): Promise<RouteResponse> {
    const points = this.getDeliveryPoints(false);
    const endPoint = points.find((p) => p.pointId === payload.endPointId);

    if (!endPoint) {
      throw new Error('Địa điểm đích không hợp lệ hoặc đã bị vô hiệu hóa.');
    }

    let startLat = 0;
    let startLng = 0;
    let startNodeId: number | null = null;
    let startName = '';

    if (payload.searchType === 'CURRENT_TO_POINT') {
      if (payload.startLatitude === undefined || payload.startLongitude === undefined) {
        throw new Error('Thiếu tọa độ vị trí hiện tại');
      }
      startLat = payload.startLatitude;
      startLng = payload.startLongitude;
      startName = `Vị trí hiện tại (${startLat.toFixed(4)}, ${startLng.toFixed(4)})`;

      const nearest = mockDijkstraRouter.findNearestNode(startLat, startLng);
      if (nearest) {
        startNodeId = nearest.node.id;
      }
    } else {
      const startPoint = points.find((p) => p.pointId === payload.startPointId);
      if (!startPoint) {
        throw new Error('Địa điểm xuất phát không hợp lệ');
      }
      startLat = startPoint.latitude;
      startLng = startPoint.longitude;
      startName = startPoint.pointName;
      startNodeId = startPoint.nodeId || 101;
    }

    const endNodeId = endPoint.nodeId || 103;

    // Check if start node can be mapped to road network
    if (!startNodeId) {
      // Record NO_PATH in history
      this.recordHistory({
        driverId,
        driverUsername,
        searchType: payload.searchType,
        startPointId: payload.startPointId || null,
        startPointName: startName,
        endPointId: endPoint.pointId,
        endPointName: endPoint.pointName,
        startNodeId: null,
        distanceM: null,
        status: 'NO_PATH',
      });

      return {
        status: 'NO_PATH',
        distanceMeters: 0,
        startPointName: startName,
        endPointName: endPoint.pointName,
        start: { latitude: startLat, longitude: startLng },
        end: { latitude: endPoint.latitude, longitude: endPoint.longitude },
        pathNodes: [],
        coordinates: [],
        message: 'Không tìm thấy nút mạng đường phù hợp gần vị trí xuất phát.',
        isMockData: true,
      };
    }

    // Run Dijkstra
    const pathResult = mockDijkstraRouter.computeShortestPath(startNodeId, endNodeId);

    if (!pathResult) {
      this.recordHistory({
        driverId,
        driverUsername,
        searchType: payload.searchType,
        startPointId: payload.startPointId || null,
        startPointName: startName,
        endPointId: endPoint.pointId,
        endPointName: endPoint.pointName,
        startNodeId,
        distanceM: null,
        status: 'NO_PATH',
      });

      return {
        status: 'NO_PATH',
        distanceMeters: 0,
        startPointName: startName,
        endPointName: endPoint.pointName,
        start: { latitude: startLat, longitude: startLng },
        end: { latitude: endPoint.latitude, longitude: endPoint.longitude },
        pathNodes: [],
        coordinates: [],
        message: 'Không tìm thấy tuyến đường phù hợp giữa hai địa điểm.',
        isMockData: true,
      };
    }

    // Base waypoints connecting start point, graph nodes, and end point
    const baseCoordinates = [
      { latitude: startLat, longitude: startLng, nodeName: startName },
      ...pathResult.coordinates,
      { latitude: endPoint.latitude, longitude: endPoint.longitude, nodeName: endPoint.pointName },
    ];

    // Fetch realistic road-snapped curvature along actual street lanes & intersections
    let routeCoordinates = baseCoordinates;
    let finalDistance = pathResult.distanceMeters;

    const roadCurvature = await fetchRoadSnappedCoordinates(baseCoordinates);
    if (roadCurvature && roadCurvature.coordinates.length > 2) {
      routeCoordinates = roadCurvature.coordinates;
      if (roadCurvature.distanceMeters && roadCurvature.distanceMeters > 0) {
        finalDistance = roadCurvature.distanceMeters;
      }
    }

    // Record COMPLETED in history
    this.recordHistory({
      driverId,
      driverUsername,
      searchType: payload.searchType,
      startPointId: payload.startPointId || null,
      startPointName: startName,
      endPointId: endPoint.pointId,
      endPointName: endPoint.pointName,
      startNodeId,
      distanceM: finalDistance,
      status: 'COMPLETED',
    });

    return {
      status: 'COMPLETED',
      distanceMeters: finalDistance,
      startPointName: startName,
      endPointName: endPoint.pointName,
      start: { latitude: startLat, longitude: startLng },
      end: { latitude: endPoint.latitude, longitude: endPoint.longitude },
      pathNodes: pathResult.pathNodeIds,
      coordinates: routeCoordinates,
      isMockData: true,
    };
  }

  public recordHistory(item: Omit<HistoryRecord, 'historyId' | 'searchedAt'>): HistoryRecord {
    const history = this.getHistoryFromStorage();
    const newId = history.length > 0 ? Math.max(...history.map((h) => h.historyId)) + 1 : 1;
    const newRecord: HistoryRecord = {
      ...item,
      historyId: newId,
      searchedAt: new Date().toISOString(),
    };
    history.unshift(newRecord);
    this.saveHistoryToStorage(history);
    return newRecord;
  }

  public getAllHistory(): HistoryRecord[] {
    return this.getHistoryFromStorage();
  }

  public getMyHistory(driverId: number): HistoryRecord[] {
    const all = this.getHistoryFromStorage();
    return all.filter((h) => h.driverId === driverId);
  }

  // --- Dashboard Stats & Charts ---

  public getDashboardStats(): DashboardStats {
    const points = this.getDeliveryPoints(false);
    const history = this.getHistoryFromStorage();

    const activePoints = points.filter((p) => p.isActive).length;
    const inactivePoints = points.length - activePoints;

    const completed = history.filter((h) => h.status === 'COMPLETED').length;
    const noPath = history.filter((h) => h.status === 'NO_PATH').length;

    const activeDrivers = new Set(history.map((h) => h.driverId)).size;

    return {
      totalDeliveryPoints: points.length,
      activeDeliveryPoints: activePoints,
      inactiveDeliveryPoints: inactivePoints,
      totalSearches: history.length,
      successfulSearches: completed,
      noPathSearches: noPath,
      activeDriversCount: activeDrivers,
      isMockData: true,
    };
  }

  public getSearchesByDate(days: number = 7): SearchesByDate[] {
    const history = this.getHistoryFromStorage();
    const result: SearchesByDate[] = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayRecords = history.filter((h) => h.searchedAt.startsWith(dateStr));
      const completed = dayRecords.filter((h) => h.status === 'COMPLETED').length;
      const noPath = dayRecords.filter((h) => h.status !== 'COMPLETED').length;

      // Format short date label: DD/MM
      const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      result.push({
        date: label,
        completed,
        noPath,
        total: dayRecords.length,
      });
    }

    return result;
  }

  public getTopDestinations(limit: number = 5): TopDestination[] {
    const history = this.getHistoryFromStorage();
    const points = this.getDeliveryPoints(false);

    const counts = new Map<number, number>();
    for (const h of history) {
      counts.set(h.endPointId, (counts.get(h.endPointId) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([pointId, searchCount]) => {
      const point = points.find((p) => p.pointId === pointId);
      return {
        pointId,
        pointName: point ? point.pointName : `Điểm #${pointId}`,
        address: point ? point.address : '',
        searchCount,
      };
    });
  }
}

export const mockStorage = new MockStorageService();

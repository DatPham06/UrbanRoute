/**
 * Types & Data Contracts for UrbanRoute Logistics System
 * Aligned with Oracle DB 23ai 5-table schema:
 * ACCOUNTS, ROAD_NODES, ROAD_EDGES, DELIVERY_POINTS, HISTORY
 */

export type UserRole = 'ADMIN' | 'DRIVER' | 'USER';

export interface Account {
  accountId: number;
  username: string;
  role: UserRole;
  isActive: boolean;
  fullName?: string;
  phone?: string;
}

export interface AuthSession {
  token: string;
  user: Account;
}

export interface RoadNode {
  nodeId: number;
  nodeName: string;
  latitude: number;
  longitude: number;
}

export interface RoadEdge {
  edgeId: number;
  sourceNodeId: number;
  targetNodeId: number;
  lengthM: number;
  roadName: string;
}

export interface DeliveryPoint {
  pointId: number;
  pointName: string;
  address: string;
  latitude: number;
  longitude: number;
  nodeId?: number | null;
  createdBy: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SearchType = 'CURRENT_TO_POINT' | 'POINT_TO_POINT';

export type RouteStatus = 'COMPLETED' | 'NO_PATH' | 'FAILED';

export interface RouteSearchPayload {
  searchType: SearchType;
  startLatitude?: number;
  startLongitude?: number;
  startPointId?: number;
  endPointId: number;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  nodeId?: number;
  nodeName?: string;
}

export interface RouteResponse {
  status: RouteStatus;
  distanceMeters: number;
  startPointName?: string;
  endPointName?: string;
  start: {
    latitude: number;
    longitude: number;
  };
  end: {
    latitude: number;
    longitude: number;
  };
  pathNodes: number[];
  coordinates: RouteCoordinate[];
  message?: string;
  isMockData?: boolean;
}

export interface HistoryRecord {
  historyId: number;
  driverId: number;
  driverUsername?: string;
  searchType: SearchType;
  startPointId?: number | null;
  startPointName?: string;
  endPointId: number;
  endPointName?: string;
  startNodeId?: number | null;
  distanceM?: number | null;
  status: RouteStatus;
  searchedAt: string;
}

export interface DashboardStats {
  totalDeliveryPoints: number;
  activeDeliveryPoints: number;
  inactiveDeliveryPoints: number;
  totalSearches: number;
  successfulSearches: number;
  noPathSearches: number;
  activeDriversCount: number;
  isMockData: boolean;
}

export interface SearchesByDate {
  date: string;
  completed: number;
  noPath: number;
  total: number;
}

export interface TopDestination {
  pointId: number;
  pointName: string;
  address: string;
  searchCount: number;
}

export interface NotificationItem {
  id: string;
  historyId: number;
  driverUsername: string;
  searchType: SearchType;
  status: RouteStatus;
  destinationName: string;
  distanceM?: number;
  timestamp: string;
  read: boolean;
}

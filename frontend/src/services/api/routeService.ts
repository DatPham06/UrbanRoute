import { USE_MOCK_API } from '../../config/api';
import { RouteResponse, RouteSearchPayload } from '../../types';
import { mockStorage } from '../mock/mockStorage';
import { apiClient } from './client';

export const routeService = {
  /**
   * Computes shortest route using Dijkstra algorithm on Spring Boot backend
   * POST /api/routes/shortest
   */
  async computeShortestRoute(
    payload: RouteSearchPayload,
    driverId: number = 2,
    driverUsername: string = 'driver'
  ): Promise<RouteResponse> {
    if (USE_MOCK_API) {
      // Simulate realistic processing calculation delay
      await new Promise((r) => setTimeout(r, 450));
      return mockStorage.computeShortestRoute(payload, driverId, driverUsername);
    }

    const response = await apiClient.post<RouteResponse>('/api/routes/shortest', payload);
    return response.data;
  },
};

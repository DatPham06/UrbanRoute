import { USE_MOCK_API } from '../../config/api';
import { DashboardStats, SearchesByDate, TopDestination } from '../../types';
import { mockStorage } from '../mock/mockStorage';
import { apiClient } from './client';

export const dashboardService = {
  /**
   * Admin: Get dashboard overview stats
   * GET /api/admin/dashboard/stats
   */
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.getDashboardStats();
    }
    const response = await apiClient.get<DashboardStats>('/api/admin/dashboard/stats');
    return response.data;
  },

  /**
   * Admin: Get daily search trends
   */
  async getSearchesByDate(days: number = 7): Promise<SearchesByDate[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.getSearchesByDate(days);
    }
    const response = await apiClient.get<SearchesByDate[]>(`/api/admin/dashboard/trends?days=${days}`);
    return response.data;
  },

  /**
   * Admin: Get top 5 destinations
   */
  async getTopDestinations(limit: number = 5): Promise<TopDestination[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.getTopDestinations(limit);
    }
    const response = await apiClient.get<TopDestination[]>(`/api/admin/dashboard/top-destinations?limit=${limit}`);
    return response.data;
  },
};

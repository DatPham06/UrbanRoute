import { USE_MOCK_API } from '../../config/api';
import { HistoryRecord } from '../../types';
import { mockStorage } from '../mock/mockStorage';
import { apiClient } from './client';

export const historyService = {
  /**
   * Driver: Get my history
   * GET /api/history/my
   */
  async getMyHistory(driverId: number = 2): Promise<HistoryRecord[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.getMyHistory(driverId);
    }
    const response = await apiClient.get<HistoryRecord[]>('/api/history/my');
    return response.data;
  },

  /**
   * Admin: Get all driver history
   * GET /api/admin/history
   */
  async getAdminHistory(): Promise<HistoryRecord[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 250));
      return mockStorage.getAllHistory();
    }
    const response = await apiClient.get<HistoryRecord[]>('/api/admin/history');
    return response.data;
  },
};

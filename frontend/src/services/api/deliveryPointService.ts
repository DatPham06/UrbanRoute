import { USE_MOCK_API } from '../../config/api';
import { DeliveryPoint } from '../../types';
import { mockStorage } from '../mock/mockStorage';
import { apiClient } from './client';

export interface CreateDeliveryPointDto {
  pointName: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface UpdateDeliveryPointDto {
  pointName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export const deliveryPointService = {
  /**
   * Driver endpoint: only returns active points
   * GET /api/delivery-points
   */
  async getDriverDeliveryPoints(): Promise<DeliveryPoint[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.getDeliveryPoints(true);
    }
    const response = await apiClient.get<DeliveryPoint[]>('/api/delivery-points');
    return response.data;
  },

  /**
   * Admin endpoint: returns all points (active & inactive)
   * GET /api/admin/delivery-points
   */
  async getAdminDeliveryPoints(): Promise<DeliveryPoint[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 250));
      return mockStorage.getDeliveryPoints(false);
    }
    const response = await apiClient.get<DeliveryPoint[]>('/api/admin/delivery-points');
    return response.data;
  },

  /**
   * Admin: Add new delivery point
   * POST /api/admin/delivery-points
   */
  async createDeliveryPoint(data: CreateDeliveryPointDto, createdBy: string = 'admin'): Promise<DeliveryPoint> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      return mockStorage.createDeliveryPoint({
        ...data,
        createdBy,
      });
    }
    const response = await apiClient.post<DeliveryPoint>('/api/admin/delivery-points', data);
    return response.data;
  },

  /**
   * Admin: Update delivery point
   * PUT /api/admin/delivery-points/{id}
   */
  async updateDeliveryPoint(id: number, data: UpdateDeliveryPointDto): Promise<DeliveryPoint> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      return mockStorage.updateDeliveryPoint(id, data);
    }
    const response = await apiClient.put<DeliveryPoint>(`/api/admin/delivery-points/${id}`, data);
    return response.data;
  },

  /**
   * Admin: Toggle status
   * PATCH /api/admin/delivery-points/{id}/status
   */
  async toggleStatus(id: number, isActive: boolean): Promise<DeliveryPoint> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.togglePointStatus(id, isActive);
    }
    const response = await apiClient.patch<DeliveryPoint>(`/api/admin/delivery-points/${id}/status`, { isActive });
    return response.data;
  },

  /**
   * Admin: Soft delete delivery point
   * DELETE /api/admin/delivery-points/{id}
   */
  async deleteDeliveryPoint(id: number): Promise<boolean> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStorage.deleteDeliveryPoint(id);
    }
    await apiClient.delete(`/api/admin/delivery-points/${id}`);
    return true;
  },
};

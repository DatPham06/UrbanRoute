import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { deliveryPointService, CreateDeliveryPointDto } from '../../services/api/deliveryPointService';
import { DeliveryPoint } from '../../types';
import { Switch } from '../../components/common/Switch';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';
import { GoogleMapWrapper } from '../../components/maps/GoogleMapWrapper';
import { useToast } from '../../contexts/ToastContext';
import { validateLatitude, validateLongitude } from '../../utils/validators';
import { formatDateTime } from '../../utils/formatters';
import { USE_MOCK_API } from '../../config/api';

export const AdminDeliveryPointsPage: React.FC = () => {
  const { success, error, info } = useToast();

  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [formData, setFormData] = useState<CreateDeliveryPointDto>({
    pointName: '',
    address: '',
    latitude: 10.7769,
    longitude: 106.7009,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Soft delete confirm modal state
  const [deletingPoint, setDeletingPoint] = useState<DeliveryPoint | null>(null);

  // View on map modal state
  const [viewingPoint, setViewingPoint] = useState<DeliveryPoint | null>(null);

  const loadPoints = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await deliveryPointService.getAdminDeliveryPoints();
      setPoints(data);
    } catch {
      error('Không thể tải danh sách địa điểm vận chuyển');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // Filtering
  const filteredPoints = points.filter((p) => {
    const matchesSearch =
      p.pointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return p.isActive;
    if (statusFilter === 'INACTIVE') return !p.isActive;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPoints.length / pageSize) || 1;
  const paginatedPoints = filteredPoints.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setEditingPoint(null);
    setFormData({
      pointName: '',
      address: '',
      latitude: 10.7769,
      longitude: 106.7009,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (point: DeliveryPoint) => {
    setEditingPoint(point);
    setFormData({
      pointName: point.pointName,
      address: point.address,
      latitude: point.latitude,
      longitude: point.longitude,
      isActive: point.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Toggle status
  const handleToggleStatus = async (point: DeliveryPoint) => {
    const newStatus = !point.isActive;
    try {
      await deliveryPointService.toggleStatus(point.pointId, newStatus);
      setPoints((prev) =>
        prev.map((p) => (p.pointId === point.pointId ? { ...p, isActive: newStatus } : p))
      );
      if (newStatus) {
        success(`Đã kích hoạt địa điểm "${point.pointName}"`);
      } else {
        info(`Đã tạm dừng địa điểm "${point.pointName}". Địa điểm này sẽ ẩn khỏi lựa chọn của tài xế.`);
      }
    } catch {
      error('Không thể cập nhật trạng thái địa điểm');
    }
  };

  // Soft delete confirm
  const handleConfirmDelete = async () => {
    if (!deletingPoint) return;
    try {
      await deliveryPointService.deleteDeliveryPoint(deletingPoint.pointId);
      setPoints((prev) =>
        USE_MOCK_API
          ? prev.map((p) => (p.pointId === deletingPoint.pointId ? { ...p, isActive: false } : p))
          : prev.filter((p) => p.pointId !== deletingPoint.pointId)
      );
      setCurrentPage(1);
      success(USE_MOCK_API
        ? `Đã vô hiệu hóa địa điểm "${deletingPoint.pointName}"`
        : `Đã xóa địa điểm "${deletingPoint.pointName}" khỏi danh sách`);
      setDeletingPoint(null);
    } catch {
      error('Không thể xóa địa điểm');
    }
  };

  // Form validation
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.pointName.trim()) {
      errs.pointName = 'Vui lòng nhập tên địa điểm';
    }
    if (!formData.address.trim()) {
      errs.address = 'Vui lòng nhập địa chỉ';
    }
    const latValidation = validateLatitude(formData.latitude);
    if (!latValidation.isValid) {
      errs.latitude = latValidation.error || 'Vĩ độ không hợp lệ';
    }
    const lngValidation = validateLongitude(formData.longitude);
    if (!lngValidation.isValid) {
      errs.longitude = lngValidation.error || 'Kinh độ không hợp lệ';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editingPoint) {
        const updated = await deliveryPointService.updateDeliveryPoint(editingPoint.pointId, formData);
        setPoints((prev) =>
          prev.map((p) => (p.pointId === editingPoint.pointId ? updated : p))
        );
        success(`Đã cập nhật địa điểm "${updated.pointName}"`);
      } else {
        const created = await deliveryPointService.createDeliveryPoint(formData);
        setPoints((prev) => [created, ...prev]);
        success(`Đã thêm mới địa điểm "${created.pointName}" thành công!`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu địa điểm';
      error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Điểm giao nhận
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Thêm, chỉnh sửa và quản lý các điểm dùng để tìm đường.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm điểm</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên hoặc địa chỉ..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
          />
        </div>

        {/* Status Filter buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-medium">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({points.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoạt động ({points.filter((p) => p.isActive).length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('INACTIVE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tạm tắt ({points.filter((p) => !p.isActive).length})
            </button>
          </div>
        </div>
      </div>

      {/* Points Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Mã</th>
                <th className="py-3 px-4">Tên địa điểm</th>
                <th className="py-3 px-4">Địa chỉ</th>
                <th className="py-3 px-4">Tọa độ (Lat, Lng)</th>
                <th className="py-3 px-4">Nút đường</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Đang tải dữ liệu địa điểm...</div>
                  </td>
                </tr>
              ) : paginatedPoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Không tìm thấy địa điểm nào</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
                  </td>
                </tr>
              ) : (
                paginatedPoints.map((point) => (
                  <tr key={point.pointId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                      #{point.pointId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{point.pointName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {point.address}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {point.nodeId ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Node #{point.nodeId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={point.isActive}
                          onChange={() => handleToggleStatus(point)}
                        />
                        <span className="text-[11px] font-medium text-slate-600 w-16 text-left">
                          {point.isActive ? 'Bật' : 'Tắt'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingPoint(point)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Xem vị trí trên bản đồ"
                          aria-label="Xem vị trí"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(point)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Chỉnh sửa thông tin"
                          aria-label="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPoint(point)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Vô hiệu hóa địa điểm"
                          aria-label="Vô hiệu hóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredPoints.length}
          pageSize={pageSize}
        />
      </div>

      {/* Add / Edit Delivery Point Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPoint ? 'Chỉnh sửa địa điểm vận chuyển' : 'Thêm địa điểm vận chuyển mới'}
        description="Điền thông tin và chọn vị trí tọa độ trên bản đồ hoặc nhập thủ công"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Tên địa điểm *
            </label>
            <input
              type="text"
              value={formData.pointName}
              onChange={(e) => setFormData({ ...formData, pointName: e.target.value })}
              placeholder="VD: Kho Hàng Sân Bay Tân Sơn Nhất"
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            {formErrors.pointName && (
              <p className="mt-1 text-xs text-rose-500">{formErrors.pointName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Địa chỉ chi tiết *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="VD: Đường Trường Sơn, Phường 2, Tân Bình"
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            {formErrors.address && (
              <p className="mt-1 text-xs text-rose-500">{formErrors.address}</p>
            )}
          </div>

          {/* Interactive Map Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Bản đồ chọn tọa độ (Kéo ghim hoặc nhấp vào bản đồ)
            </label>
            <LocationPickerMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={(lat, lng) => {
                setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
              }}
            />
          </div>

          {/* Manual Lat & Lng Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Vĩ độ (Latitude) *
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              {formErrors.latitude && (
                <p className="mt-1 text-xs text-rose-500">{formErrors.latitude}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Kinh độ (Longitude) *
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              {formErrors.longitude && (
                <p className="mt-1 text-xs text-rose-500">{formErrors.longitude}</p>
              )}
            </div>
          </div>

          {/* Active status */}
          <div className="pt-2">
            <Switch
              checked={formData.isActive}
              onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              label="Kích hoạt địa điểm này (Cho phép tài xế tìm đường đến điểm này)"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : editingPoint ? 'Cập nhật địa điểm' : 'Lưu địa điểm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Soft Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingPoint}
        onClose={() => setDeletingPoint(null)}
        title={USE_MOCK_API ? 'Xác nhận vô hiệu hóa địa điểm' : 'Xác nhận xóa địa điểm'}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{USE_MOCK_API ? 'Vô hiệu hóa địa điểm' : 'Xóa địa điểm khỏi danh sách'}</p>
              <p className="mt-0.5 opacity-90">
                {USE_MOCK_API
                  ? <>Địa điểm <strong>{deletingPoint?.pointName}</strong> sẽ chuyển sang tạm dừng và ẩn khỏi lựa chọn của tài xế.</>
                  : <>Địa điểm <strong>{deletingPoint?.pointName}</strong> sẽ được ẩn khỏi danh sách quản lý và lựa chọn của tài xế.</>}
                {' '}Lịch sử tìm kiếm vẫn được giữ lại.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setDeletingPoint(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
            >
              {USE_MOCK_API ? 'Xác nhận tắt địa điểm' : 'Xác nhận xóa địa điểm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View on Map Modal */}
      <Modal
        isOpen={!!viewingPoint}
        onClose={() => setViewingPoint(null)}
        title={viewingPoint?.pointName || 'Vị trí địa điểm'}
        description={viewingPoint?.address}
        maxWidth="2xl"
      >
        {viewingPoint && (
          <div className="space-y-3">
            <GoogleMapWrapper
              deliveryPoints={[viewingPoint]}
              selectedPointId={viewingPoint.pointId}
              className="w-full h-80"
            />
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span>
                Tọa độ: <strong className="font-mono text-slate-800">{viewingPoint.latitude.toFixed(5)}, {viewingPoint.longitude.toFixed(5)}</strong>
              </span>
              <Badge variant={viewingPoint.isActive ? 'success' : 'danger'}>
                {viewingPoint.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

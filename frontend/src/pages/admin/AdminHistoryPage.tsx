import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Calendar,
  Route,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { historyService } from '../../services/api/historyService';
import { HistoryRecord, RouteStatus, SearchType } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import {
  formatDateTime,
  formatDistance,
  getSearchTypeLabel,
  getStatusBadgeConfig,
} from '../../utils/formatters';

export const AdminHistoryPage: React.FC = () => {
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RouteStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | SearchType>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await historyService.getAdminHistory();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Filtering
  const filteredList = historyList.filter((item) => {
    // Search by driver username or destination
    const matchesSearch =
      (item.driverUsername || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.endPointName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.startPointName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && item.searchType !== typeFilter) return false;

    if (dateFilter) {
      const itemDate = item.searchedAt.split('T')[0];
      if (itemDate !== dateFilter) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Lịch sử tìm đường
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Xem các lượt tìm đường của tài xế.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
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
              placeholder="Tìm tài xế, điểm đến..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | RouteStatus);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">Thành công (COMPLETED)</option>
              <option value="NO_PATH">Không tìm thấy tuyến (NO_PATH)</option>
              <option value="FAILED">Lỗi xử lý (FAILED)</option>
            </select>
          </div>

          {/* Search type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'ALL' | SearchType);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-700"
            >
              <option value="ALL">Tất cả chế độ tìm</option>
              <option value="CURRENT_TO_POINT">Vị trí hiện tại → Điểm đến</option>
              <option value="POINT_TO_POINT">Điểm xuất phát → Điểm đến</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-700"
            />
          </div>
        </div>

        {/* Clear filter chip if active */}
        {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateFilter) && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Đang lọc: {filteredList.length} kết quả</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setDateFilter('');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Mã</th>
                <th className="py-3 px-4">Tài xế</th>
                <th className="py-3 px-4">Chế độ</th>
                <th className="py-3 px-4">Điểm xuất phát</th>
                <th className="py-3 px-4">Điểm đích</th>
                <th className="py-3 px-4">Khoảng cách</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Đang tải lịch sử tìm đường...</div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Không có bản ghi lịch sử nào</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const badge = getStatusBadgeConfig(item.status);
                  return (
                    <tr key={item.historyId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                        #{item.historyId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.driverUsername || `Tài xế #${item.driverId}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.searchType === 'CURRENT_TO_POINT' ? 'Vị trí hiện tại' : 'Điểm - Điểm'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {item.startPointName || '--'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800">
                        {item.endPointName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {item.distanceM ? formatDistance(item.distanceM) : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {formatDateTime(item.searchedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Xem chi tiết bản ghi"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
        />
      </div>

      {/* History Detail Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Chi tiết lịch sử #${selectedRecord?.historyId}`}
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">Tài xế thực hiện:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedRecord.driverUsername}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Thời gian yêu cầu:</span>
                <span className="font-medium text-slate-800">{formatDateTime(selectedRecord.searchedAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Chế độ tìm kiếm:</span>
                <span className="font-medium text-slate-800">{getSearchTypeLabel(selectedRecord.searchType)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Trạng thái kết quả:</span>
                <Badge variant={getStatusBadgeConfig(selectedRecord.status).variant}>
                  {getStatusBadgeConfig(selectedRecord.status).label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Điểm xuất phát:</span>
                <p className="font-medium text-slate-800 text-xs mt-0.5">{selectedRecord.startPointName || 'Tọa độ GPS'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Điểm đích đến:</span>
                <p className="font-medium text-slate-800 text-xs mt-0.5">{selectedRecord.endPointName}</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Quãng đường ước tính</span>
                <p className="font-mono font-bold text-blue-600 text-sm mt-0.5">
                  {selectedRecord.distanceM ? `${formatDistance(selectedRecord.distanceM)} (${selectedRecord.distanceM.toLocaleString()} mét)` : 'Không xác định'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

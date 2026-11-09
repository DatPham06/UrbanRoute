import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter, Calendar, MapPin, Route, RotateCcw } from 'lucide-react';
import { historyService } from '../../services/api/historyService';
import { HistoryRecord, RouteStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, formatDistance, getSearchTypeLabel, getStatusBadgeConfig } from '../../utils/formatters';

export const DriverHistoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | RouteStatus>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await historyService.getMyHistory(currentUser?.accountId || 2);
      setHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredList = historyList.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (dateFilter) {
      const itemDate = item.searchedAt.split('T')[0];
      if (itemDate !== dateFilter) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Lịch sử tìm đường
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Xem lại các lượt tìm đường của bạn.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status selector */}
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | RouteStatus);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">Thành công</option>
              <option value="NO_PATH">Không tìm thấy tuyến</option>
            </select>
          </div>

          {/* Date picker */}
          <div className="w-full sm:w-44">
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

        {(statusFilter !== 'ALL' || dateFilter) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setDateFilter('');
              setCurrentPage(1);
            }}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Chế độ</th>
                <th className="py-3 px-4">Điểm xuất phát</th>
                <th className="py-3 px-4">Điểm đến</th>
                <th className="py-3 px-4">Quãng đường</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Đang tải lịch sử của bạn...</div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Bạn chưa có lịch sử tìm kiếm nào</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const badge = getStatusBadgeConfig(item.status);
                  return (
                    <tr key={item.historyId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {formatDateTime(item.searchedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.searchType === 'CURRENT_TO_POINT' ? 'Vị trí hiện tại' : 'Điểm - Điểm'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {item.startPointName || 'Vị trí GPS'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-semibold text-slate-900">
                        {item.endPointName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-[11px]">
                        {item.distanceM ? formatDistance(item.distanceM) : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
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
    </div>
  );
};

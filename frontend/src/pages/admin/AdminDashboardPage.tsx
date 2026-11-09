import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Route,
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardService } from '../../services/api/dashboardService';
import { historyService } from '../../services/api/historyService';
import { DashboardStats, HistoryRecord, SearchesByDate, TopDestination } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { formatDateTime, formatDistance, getStatusBadgeConfig } from '../../utils/formatters';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyTrends, setDailyTrends] = useState<SearchesByDate[]>([]);
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [recentActivities, setRecentActivities] = useState<HistoryRecord[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = timeRange === 'today' ? 1 : timeRange === '7days' ? 7 : 30;
      const [statsData, trendsData, topData, historyData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getSearchesByDate(days),
        dashboardService.getTopDestinations(5),
        historyService.getAdminHistory(),
      ]);

      setStats(statsData);
      setDailyTrends(trendsData);
      setTopDestinations(topData);
      setRecentActivities(historyData.slice(0, 6));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Donut chart data: Completed vs NoPath
  const pieData = stats
    ? [
        { name: 'Thành công', value: stats.successfulSearches, color: '#10b981' },
        { name: 'Không tìm thấy đường', value: stats.noPathSearches, color: '#f59e0b' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tổng quan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi điểm giao nhận và lượt tìm đường.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-2xs text-xs font-medium">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === 'today' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === '7days' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeRange === '30days' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 ngày qua
            </button>
          </div>

          <button
            onClick={loadDashboardData}
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition"
            title="Làm mới số liệu"
            aria-label="Làm mới số liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Điểm giao nhận"
          value={stats ? stats.totalDeliveryPoints : '--'}
          subtitle={`Đang mở: ${stats?.activeDeliveryPoints || 0} • Đang tắt: ${stats?.inactiveDeliveryPoints || 0}`}
          icon={MapPin}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />

        <StatCard
          title="Điểm đang mở"
          value={stats ? stats.activeDeliveryPoints : '--'}
          subtitle={`${stats ? Math.round((stats.activeDeliveryPoints / (stats.totalDeliveryPoints || 1)) * 100) : 0}% tổng số điểm`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />

        <StatCard
          title="Tổng lượt tìm đường"
          value={stats ? stats.totalSearches : '--'}
          subtitle={`Thành công: ${stats?.successfulSearches || 0} • Không tìm thấy: ${stats?.noPathSearches || 0}`}
          icon={Route}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-50"
        />

        <StatCard
          title="Tài xế đã tìm đường"
          value={stats ? stats.activeDriversCount : '--'}
          icon={Users}
          iconColor="text-sky-600"
          iconBgColor="bg-sky-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Lượt tìm đường theo ngày</h3>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="completed" name="Thành công" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noPath" name="Không tìm được tuyến" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success Rate Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Tỷ lệ tìm được tuyến</h3>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[11px] block">Thành công</span>
                <span className="font-bold text-slate-800">{stats?.successfulSearches || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div>
                <span className="text-slate-500 text-[11px] block">Không tìm thấy</span>
                <span className="font-bold text-slate-800">{stats?.noPathSearches || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Destinations & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Destinations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top 5 Điểm Đến Được Tìm Nhiều Nhất</h3>
              <p className="text-xs text-slate-500">Xếp theo số lượt được chọn làm điểm đến.</p>
            </div>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {topDestinations.map((dest, idx) => {
              const maxCount = topDestinations[0]?.searchCount || 1;
              const percent = Math.round((dest.searchCount / maxCount) * 100);

              return (
                <div key={dest.pointId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {dest.pointName}
                    </span>
                    <span className="font-bold text-blue-600">{dest.searchCount} lượt</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Search Activities */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hoạt Động Tìm Tuyến Gần Đây</h3>
              <p className="text-xs text-slate-500">Các lượt tìm đường mới nhất.</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.map((act) => {
              const badge = getStatusBadgeConfig(act.status);
              return (
                <div key={act.historyId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{act.driverUsername || 'Tài xế'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 text-[11px]">{formatDateTime(act.searchedAt)}</span>
                    </div>
                    <div className="text-slate-600 truncate mt-0.5">
                      Đích đến: <strong className="text-slate-800">{act.endPointName}</strong>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {act.distanceM && (
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {formatDistance(act.distanceM)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

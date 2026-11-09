import React, { useState, useEffect, useCallback } from 'react';
import {
  Navigation,
  MapPin,
  Route,
  Compass,
  ArrowRight,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
} from 'lucide-react';
import { deliveryPointService } from '../../services/api/deliveryPointService';
import { routeService } from '../../services/api/routeService';
import { DeliveryPoint, RouteResponse, SearchType } from '../../types';
import { GoogleMapWrapper } from '../../components/maps/GoogleMapWrapper';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistance } from '../../utils/formatters';
import { validatePointToPointSelection } from '../../utils/validators';

export const DriverRoutesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error, warning } = useToast();
  const { refreshNotifications } = useNotifications();

  // Mode: Tab 1 = CURRENT_TO_POINT, Tab 2 = POINT_TO_POINT
  const [activeTab, setActiveTab] = useState<SearchType>('CURRENT_TO_POINT');

  // Active delivery points only (Inactive points are filtered out!)
  const [activePoints, setActivePoints] = useState<DeliveryPoint[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);

  // Tab 1 state: GPS
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [tab1EndPointId, setTab1EndPointId] = useState<number | ''>('');

  // Tab 2 state: Point to Point
  const [tab2StartPointId, setTab2StartPointId] = useState<number | ''>('');
  const [tab2EndPointId, setTab2EndPointId] = useState<number | ''>('');
  const [pointSelectionError, setPointSelectionError] = useState<string | null>(null);

  // Route result
  const [isSearching, setIsSearching] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);

  // Load only ACTIVE delivery points for driver
  const loadPoints = useCallback(async () => {
    setIsLoadingPoints(true);
    try {
      const points = await deliveryPointService.getDriverDeliveryPoints();
      setActivePoints(points);
    } catch {
      error('Không thể tải danh sách địa điểm vận chuyển');
    } finally {
      setIsLoadingPoints(false);
    }
  }, [error]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  // Handle Geolocation request (Tab 1)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setUserGps({ lat, lng });
        setIsGettingGps(false);
        success(`Đã lấy vị trí GPS thành công: ${lat}, ${lng}`);
      },
      (err) => {
        setIsGettingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép quyền trên trình duyệt để sử dụng chế độ này.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Không thể xác định vị trí GPS của thiết bị.');
        } else {
          setGpsError('Hết thời gian chờ lấy tín hiệu GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Switch tabs
  const handleTabSwitch = (tab: SearchType) => {
    setActiveTab(tab);
    setPointSelectionError(null);
  };

  // Find shortest route
  const handleFindRoute = async () => {
    setPointSelectionError(null);

    if (activeTab === 'CURRENT_TO_POINT') {
      if (!userGps) {
        warning('Vui lòng nhấn "Lấy vị trí hiện tại" trước khi tìm đường');
        return;
      }
      if (!tab1EndPointId) {
        warning('Vui lòng chọn địa điểm đích');
        return;
      }

      setIsSearching(true);
      try {
        const result = await routeService.computeShortestRoute(
          {
            searchType: 'CURRENT_TO_POINT',
            startLatitude: userGps.lat,
            startLongitude: userGps.lng,
            endPointId: Number(tab1EndPointId),
          },
          currentUser?.accountId || 2,
          currentUser?.username || 'driver'
        );

        setRouteResult(result);
        refreshNotifications();

        if (result.status === 'COMPLETED') {
          success(`Đã tìm thấy tuyến đường tối ưu! Tổng quãng đường: ${formatDistance(result.distanceMeters)}`);
        } else {
          warning(result.message || 'Không tìm thấy tuyến đường phù hợp');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình tìm tuyến';
        error(msg);
      } finally {
        setIsSearching(false);
      }
    } else {
      // POINT_TO_POINT
      const startId = tab2StartPointId ? Number(tab2StartPointId) : null;
      const endId = tab2EndPointId ? Number(tab2EndPointId) : null;

      const validation = validatePointToPointSelection(startId, endId);
      if (!validation.isValid) {
        setPointSelectionError(validation.error || 'Lựa chọn địa điểm không hợp lệ');
        return;
      }

      setIsSearching(true);
      try {
        const result = await routeService.computeShortestRoute(
          {
            searchType: 'POINT_TO_POINT',
            startPointId: Number(tab2StartPointId),
            endPointId: Number(tab2EndPointId),
          },
          currentUser?.accountId || 2,
          currentUser?.username || 'driver'
        );

        setRouteResult(result);
        refreshNotifications();

        if (result.status === 'COMPLETED') {
          success(`Đã tìm thấy tuyến đường ngắn nhất! Khoảng cách: ${formatDistance(result.distanceMeters)}`);
        } else {
          warning(result.message || 'Không tìm thấy tuyến đường kết nối giữa hai địa điểm');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình tìm tuyến';
        error(msg);
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Clear route result
  const handleClearRoute = () => {
    setRouteResult(null);
  };

  // Derive start/end points for map rendering
  const mapStartPoint = routeResult
    ? {
        latitude: routeResult.start.latitude,
        longitude: routeResult.start.longitude,
        name: routeResult.startPointName || 'Điểm xuất phát',
      }
    : userGps && activeTab === 'CURRENT_TO_POINT'
    ? {
        latitude: userGps.lat,
        longitude: userGps.lng,
        name: 'Vị trí hiện tại của bạn',
      }
    : undefined;

  const mapEndPoint = routeResult
    ? {
        latitude: routeResult.end.latitude,
        longitude: routeResult.end.longitude,
        name: routeResult.endPointName || 'Điểm đích',
      }
    : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)] min-h-[640px]">
      {/* Control Panel (Left on Desktop, Top/Bottom on Mobile) */}
      <div className="w-full lg:w-96 flex flex-col shrink-0 gap-4 overflow-y-auto">
        {/* Main Routing Card */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Tìm đường</h2>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleTabSwitch('CURRENT_TO_POINT')}
              aria-pressed={activeTab === 'CURRENT_TO_POINT'}
              className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'CURRENT_TO_POINT'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Từ vị trí hiện tại</span>
            </button>
            <button
              onClick={() => handleTabSwitch('POINT_TO_POINT')}
              aria-pressed={activeTab === 'POINT_TO_POINT'}
              className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'POINT_TO_POINT'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Giữa hai điểm</span>
            </button>
          </div>

          {/* TAB 1: CURRENT_TO_POINT */}
          {activeTab === 'CURRENT_TO_POINT' && (
            <div className="space-y-4">
              {/* Geolocation Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Vị trí xuất phát</span>
                  {userGps && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Đã định vị
                    </span>
                  )}
                </div>

                {userGps ? (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-mono text-[11px] text-slate-800">
                      Tọa độ: {userGps.lat.toFixed(5)}, {userGps.lng.toFixed(5)}
                    </p>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isGettingGps}
                      className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1 mt-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Cập nhật vị trí
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isGettingGps}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                    >
                      <Navigation className={`w-4 h-4 ${isGettingGps ? 'animate-spin' : ''}`} />
                      <span>{isGettingGps ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}</span>
                    </button>
                  </div>
                )}

                {gpsError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{gpsError}</span>
                  </div>
                )}
              </div>

              {/* Destination Dropdown */}
              <div>
                <label htmlFor="current-route-destination" className="mb-1 block text-sm font-medium text-slate-700">
                  Điểm đến
                </label>
                <select
                  id="current-route-destination"
                  value={tab1EndPointId}
                  onChange={(e) => setTab1EndPointId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-800"
                >
                  <option value="">Chọn điểm đến</option>
                  {activePoints.map((p) => (
                    <option key={p.pointId} value={p.pointId}>
                      {p.pointName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: POINT_TO_POINT */}
          {activeTab === 'POINT_TO_POINT' && (
            <div className="space-y-4">
              {/* Origin Dropdown */}
              <div>
                <label htmlFor="point-route-start" className="mb-1 block text-sm font-medium text-slate-700">
                  Điểm xuất phát
                </label>
                <select
                  id="point-route-start"
                  value={tab2StartPointId}
                  onChange={(e) => {
                    setTab2StartPointId(e.target.value ? Number(e.target.value) : '');
                    setPointSelectionError(null);
                  }}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-800"
                >
                  <option value="">Chọn điểm xuất phát</option>
                  {activePoints.map((p) => (
                    <option key={p.pointId} value={p.pointId}>
                      {p.pointName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Dropdown */}
              <div>
                <label htmlFor="point-route-destination" className="mb-1 block text-sm font-medium text-slate-700">
                  Điểm đến
                </label>
                <select
                  id="point-route-destination"
                  value={tab2EndPointId}
                  onChange={(e) => {
                    setTab2EndPointId(e.target.value ? Number(e.target.value) : '');
                    setPointSelectionError(null);
                  }}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-800"
                >
                  <option value="">Chọn điểm đến</option>
                  {activePoints.map((p) => (
                    <option key={p.pointId} value={p.pointId}>
                      {p.pointName}
                    </option>
                  ))}
                </select>
              </div>

              {pointSelectionError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pointSelectionError}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleFindRoute}
            disabled={isSearching}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearching ? (
              'Đang tìm đường…'
            ) : (
              <>
                <Route className="w-4 h-4" />
                <span>Tìm đường</span>
              </>
            )}
          </button>
        </div>

        {/* Route Result Card */}
        {routeResult && (
          <div className="space-y-3.5 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">Kết quả tìm đường</span>
              <Badge variant={routeResult.status === 'COMPLETED' ? 'success' : 'warning'}>
                {routeResult.status === 'COMPLETED' ? 'Thành công' : 'Không tìm thấy'}
              </Badge>
            </div>

            {routeResult.status === 'COMPLETED' ? (
              <div className="space-y-3 text-xs">
                {/* Distance Highlight */}
                <div className="rounded-md bg-slate-50 p-3">
                  <span className="block text-sm font-medium text-slate-700">
                    Quãng đường ước tính
                  </span>
                  <div className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
                    {formatDistance(routeResult.distanceMeters)}
                  </div>
                </div>

                {/* Points itinerary */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 mt-0.5 ring-4 ring-emerald-100" />
                    <div>
                      <span className="text-[11px] text-slate-400 block">Xuất phát:</span>
                      <strong className="text-slate-800">{routeResult.startPointName}</strong>
                    </div>
                  </div>

                  <div className="w-0.5 h-4 bg-slate-200 ml-1.5" />

                  <div className="flex items-start gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 mt-0.5 ring-4 ring-rose-100" />
                    <div>
                      <span className="text-[11px] text-slate-400 block">Đích đến:</span>
                      <strong className="text-slate-800">{routeResult.endPointName}</strong>
                    </div>
                  </div>
                </div>

                {/* Nodes traversed */}
                {routeResult.pathNodes && routeResult.pathNodes.length > 0 && (
                  <details className="rounded-md border border-slate-200 p-2.5 text-xs text-slate-600">
                    <summary className="cursor-pointer font-medium">Các nút đường đi qua</summary>
                    <div className="mt-2 flex flex-wrap gap-1 font-mono text-[11px]">
                      {routeResult.pathNodes.map((n, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                          N#{n}
                        </span>
                      ))}
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleFindRoute}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tìm lại</span>
                  </button>
                  <button
                    onClick={handleClearRoute}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa kết quả</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Không tìm được tuyến đường</span>
                  </p>
                  <p className="text-[11px] opacity-90">
                    {routeResult.message || 'Hãy thử chọn điểm xuất phát hoặc điểm đến khác.'}
                  </p>
                </div>
                <button
                  onClick={handleClearRoute}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Đóng thông báo
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Map View Area (Occupies remainder of screen) */}
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs bg-white min-h-[450px]">
        <GoogleMapWrapper
          deliveryPoints={activePoints}
          routeCoordinates={routeResult?.coordinates || []}
          startPoint={mapStartPoint}
          endPoint={mapEndPoint}
          onSelectPoint={(point) => {
            if (activeTab === 'CURRENT_TO_POINT') {
              setTab1EndPointId(point.pointId);
            } else {
              if (!tab2StartPointId) {
                setTab2StartPointId(point.pointId);
              } else if (!tab2EndPointId && tab2StartPointId !== point.pointId) {
                setTab2EndPointId(point.pointId);
              }
            }
          }}
          className="w-full h-full flex-1"
        />
      </div>
    </div>
  );
};

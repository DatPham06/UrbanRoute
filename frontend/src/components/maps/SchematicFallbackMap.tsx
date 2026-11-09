import React, { useState, useMemo } from 'react';
import { DeliveryPoint, RouteCoordinate } from '../../types';
import { MOCK_ROAD_EDGES, MOCK_ROAD_NODES } from '../../services/mock/mockData';
import { MapPin, Info, Navigation } from 'lucide-react';

export interface SchematicFallbackMapProps {
  deliveryPoints?: DeliveryPoint[];
  routeCoordinates?: RouteCoordinate[];
  startPoint?: { latitude: number; longitude: number; name?: string };
  endPoint?: { latitude: number; longitude: number; name?: string };
  onSelectPoint?: (point: DeliveryPoint) => void;
  selectedPointId?: number | null;
  interactive?: boolean;
}

export const SchematicFallbackMap: React.FC<SchematicFallbackMapProps> = ({
  deliveryPoints = [],
  routeCoordinates = [],
  startPoint,
  endPoint,
  onSelectPoint,
  selectedPointId,
  interactive = true,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DeliveryPoint | null>(null);

  // Map TP.HCM bounds to SVG coordinate space [0, 800] x [0, 600]
  const minLat = 10.710;
  const maxLat = 10.865;
  const minLng = 106.640;
  const maxLng = 106.810;

  const project = useMemo(() => {
    return (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * 740 + 30;
      // Invert Y because latitude increases northward
      const y = (1 - (lat - minLat) / (maxLat - minLat)) * 520 + 40;
      return { x, y };
    };
  }, []);

  const routeSvgPath = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return '';
    return routeCoordinates
      .map((c, i) => {
        const { x, y } = project(c.latitude, c.longitude);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [routeCoordinates, project]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex flex-col select-none">
      {/* Top indicator bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 backdrop-blur-xs border border-slate-700 text-xs text-slate-300 shadow-md">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Sơ đồ mạng lưới đồ thị giao thông TP.HCM (Oracle SQL Property Graph)</span>
        </div>
      </div>

      <svg
        className="w-full h-full flex-1"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
          </radialGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        <rect width="800" height="600" fill="url(#grid-glow)" className="pointer-events-none" />

        {/* River Saigon stylized aesthetic curve */}
        <path
          d="M 520,30 Q 480,180 570,260 T 450,420 T 560,580"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="24"
          strokeLinecap="round"
          opacity="0.4"
          className="pointer-events-none"
        />
        <text
          x="540"
          y="220"
          fill="#38bdf8"
          opacity="0.3"
          fontSize="12"
          fontWeight="600"
          transform="rotate(35, 540, 220)"
          className="pointer-events-none select-none"
        >
          Sông Sài Gòn
        </text>

        {/* Road Edges (Background Graph) */}
        {MOCK_ROAD_EDGES.map((edge) => {
          const src = MOCK_ROAD_NODES.find((n) => n.nodeId === edge.sourceNodeId);
          const tgt = MOCK_ROAD_NODES.find((n) => n.nodeId === edge.targetNodeId);
          if (!src || !tgt) return null;
          const p1 = project(src.latitude, src.longitude);
          const p2 = project(tgt.latitude, tgt.longitude);

          return (
            <line
              key={edge.edgeId}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.6"
              className="pointer-events-none"
            />
          );
        })}

        {/* Dijkstra Computed Shortest Path Polyline */}
        {routeSvgPath && (
          <path
            d={routeSvgPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="animate-pulse pointer-events-none"
          />
        )}

        {/* Road Nodes */}
        {MOCK_ROAD_NODES.map((node) => {
          const { x, y } = project(node.latitude, node.longitude);
          return (
            <g key={node.nodeId} className="pointer-events-none">
              <circle cx={x} cy={y} r="3" fill="#64748b" opacity="0.7" />
            </g>
          );
        })}

        {/* Delivery Points - Fixed Position, Stable Hit Area */}
        {deliveryPoints.map((point) => {
          const { x, y } = project(point.latitude, point.longitude);
          const isSelected = selectedPointId === point.pointId;
          const isHovered = hoveredPoint?.pointId === point.pointId;
          const isActive = point.isActive;
          const pointColor = isSelected ? '#3b82f6' : isActive ? '#10b981' : '#f43f5e';

          return (
            <g
              key={point.pointId}
              onClick={() => interactive && onSelectPoint && onSelectPoint(point)}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              {/* Invisible stable hit-target to prevent flicker/jitter */}
              <circle cx={x} cy={y} r="22" fill="transparent" />

              {/* Halo ring on hover or selected - completely static coordinates */}
              {(isHovered || isSelected) && (
                <circle
                  cx={x}
                  cy={y}
                  r="16"
                  fill={pointColor}
                  opacity="0.25"
                  stroke={pointColor}
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
              )}

              {/* Main marker circle */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 11 : isHovered ? 10 : 7.5}
                fill={pointColor}
                stroke="#ffffff"
                strokeWidth={isHovered || isSelected ? 2.5 : 2}
                className="transition-all duration-150 ease-out pointer-events-none drop-shadow-md"
              />

              {/* Label */}
              <text
                x={x}
                y={y - (isHovered || isSelected ? 15 : 12)}
                textAnchor="middle"
                fill={isHovered || isSelected ? '#ffffff' : '#cbd5e1'}
                fontSize={isHovered || isSelected ? '12' : '10.5'}
                fontWeight={isHovered || isSelected ? '700' : '600'}
                className="select-none pointer-events-none transition-all duration-150 drop-shadow-md"
              >
                {point.pointName.length > 22
                  ? point.pointName.substring(0, 20) + '...'
                  : point.pointName}
              </text>
            </g>
          );
        })}

        {/* Start Point Pin (Green) */}
        {startPoint && (
          <g
            className="pointer-events-none"
            transform={`translate(${project(startPoint.latitude, startPoint.longitude).x}, ${project(startPoint.latitude, startPoint.longitude).y})`}
          >
            <circle cx="0" cy="0" r="14" fill="#10b981" opacity="0.3" className="animate-ping" />
            <circle cx="0" cy="0" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="-14" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700">
              Xuất phát
            </text>
          </g>
        )}

        {/* End Point Pin (Red) */}
        {endPoint && (
          <g
            className="pointer-events-none"
            transform={`translate(${project(endPoint.latitude, endPoint.longitude).x}, ${project(endPoint.latitude, endPoint.longitude).y})`}
          >
            <circle cx="0" cy="0" r="14" fill="#ef4444" opacity="0.3" className="animate-ping" />
            <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <text x="0" y="-14" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="700">
              Đích đến
            </text>
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip Card */}
      {hoveredPoint && (
        <div className="absolute bottom-12 left-4 z-20 p-3 rounded-xl bg-slate-800/95 backdrop-blur-md border border-slate-700 text-white shadow-xl max-w-xs animate-in fade-in duration-100 pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-300">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{hoveredPoint.pointName}</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{hoveredPoint.address}</p>
          <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>
              {hoveredPoint.latitude.toFixed(4)}, {hoveredPoint.longitude.toFixed(4)}
            </span>
            <span className={hoveredPoint.isActive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {hoveredPoint.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </div>
        </div>
      )}

      {/* Bottom map legend */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Địa điểm hoạt động</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Tuyến đường Dijkstra</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Nút giao lộ (Road Node)</span>
          </div>
        </div>
        <span className="text-slate-500 text-[10px]">Tọa độ chuẩn hóa TP.HCM</span>
      </div>
    </div>
  );
};

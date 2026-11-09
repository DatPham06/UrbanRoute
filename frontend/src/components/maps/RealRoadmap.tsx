import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { DeliveryPoint, RouteCoordinate } from '../../types';
import { DEFAULT_HCMC_CENTER, DEFAULT_ZOOM } from '../../config/api';

export interface RealRoadmapProps {
  deliveryPoints?: DeliveryPoint[];
  routeCoordinates?: RouteCoordinate[];
  startPoint?: { latitude: number; longitude: number; name?: string };
  endPoint?: { latitude: number; longitude: number; name?: string };
  onSelectPoint?: (point: DeliveryPoint) => void;
  selectedPointId?: number | null;
  interactive?: boolean;
}

export const RealRoadmap: React.FC<RealRoadmapProps> = ({
  deliveryPoints = [],
  routeCoordinates = [],
  startPoint,
  endPoint,
  onSelectPoint,
  selectedPointId,
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [DEFAULT_HCMC_CENTER.lat, DEFAULT_HCMC_CENTER.lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // OpenStreetMap Standard Tile Layer (Free, no API key required, full street and building detail)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Render Delivery Points
    deliveryPoints.forEach((point) => {
      const isSelected = selectedPointId === point.pointId;
      const isActive = point.isActive;
      const color = isSelected ? '#2563eb' : isActive ? '#10b981' : '#f43f5e';

      const iconHtml = `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${color};
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <strong style="color: #0f172a; font-size: 13px;">${point.pointName}</strong>
          <div style="color: #64748b; margin-top: 4px; font-size: 11px;">${point.address}</div>
          <div style="margin-top: 6px; font-size: 10px; color: ${isActive ? '#059669' : '#dc2626'}; font-weight: 600;">
            ${isActive ? '● Đang hoạt động' : '○ Tạm dừng'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (interactive && onSelectPoint) {
          onSelectPoint(point);
        }
      });

      layerGroup.addLayer(marker);
    });

    // 2. Render Start Point (Green)
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-start-pin',
        html: `
          <div style="
            background: #16a34a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            white-space: nowrap;
          ">
            🟢 Xuất phát
          </div>
        `,
        iconAnchor: [40, 28],
      });
      const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon });
      layerGroup.addLayer(startMarker);
    }

    // 3. Render End Point (Red)
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'custom-end-pin',
        html: `
          <div style="
            background: #dc2626;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            white-space: nowrap;
          ">
            🔴 Đích đến
          </div>
        `,
        iconAnchor: [38, 28],
      });
      const endMarker = L.marker([endPoint.latitude, endPoint.longitude], { icon: endIcon });
      layerGroup.addLayer(endMarker);
    }

    // 4. Render Dijkstra Polyline
    if (routeCoordinates && routeCoordinates.length > 1) {
      const latLngs = routeCoordinates.map((c) => [c.latitude, c.longitude] as [number, number]);

      const polyline = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });

      layerGroup.addLayer(polyline);

      // Auto fit bounds to full route
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [deliveryPoints, routeCoordinates, startPoint, endPoint, selectedPointId, interactive, onSelectPoint]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px] z-0" />
    </div>
  );
};

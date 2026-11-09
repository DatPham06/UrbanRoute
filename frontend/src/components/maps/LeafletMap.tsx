import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DeliveryPoint, RouteCoordinate } from '../../types';
import { DEFAULT_HCMC_CENTER, DEFAULT_ZOOM } from '../../config/api';
import { Layers, MapPin, Navigation, Compass, Maximize2 } from 'lucide-react';

export type MapTileProvider = 'streets' | 'satellite';

// Leaflet popup strings are HTML, so treat names and addresses from the API as text.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export interface LeafletMapProps {
  deliveryPoints?: DeliveryPoint[];
  routeCoordinates?: RouteCoordinate[];
  startPoint?: { latitude: number; longitude: number; name?: string };
  endPoint?: { latitude: number; longitude: number; name?: string };
  onSelectPoint?: (point: DeliveryPoint) => void;
  selectedPointId?: number | null;
  interactive?: boolean;
  className?: string;
  showLayerSwitcher?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  deliveryPoints = [],
  routeCoordinates = [],
  startPoint,
  endPoint,
  onSelectPoint,
  selectedPointId,
  interactive = true,
  className = 'w-full h-full min-h-[480px]',
  showLayerSwitcher = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapTileProvider>('streets');
  const [selectedPointInfo, setSelectedPointInfo] = useState<DeliveryPoint | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [DEFAULT_HCMC_CENTER.lat, DEFAULT_HCMC_CENTER.lng],
        zoom: DEFAULT_ZOOM,
        maxZoom: 20,
        minZoom: 9,
        zoomControl: false, // We will position controls neatly
      });

      // Add Zoom Control to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Default Base Tile Layer: OpenStreetMap Standard
      const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxNativeZoom: 19,
        maxZoom: 20,
      }).addTo(map);

      baseTileLayerRef.current = baseLayer;

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

  // Handle Layer Switching (Streets vs Satellite vs Topo)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let newTileLayer: L.TileLayer;

    if (activeLayer === 'satellite') {
      // ESRI World Imagery (High-res real satellite images with auto-upscaling to prevent gray screen)
      newTileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxNativeZoom: 18,
          maxZoom: 20,
        }
      );
    } else {
      // Standard Streets (OpenStreetMap with auto-upscaling to prevent gray screen)
      newTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxNativeZoom: 19,
        maxZoom: 20,
      });
    }

    newTileLayer.addTo(map);
    baseTileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Update Markers, Pins and Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Delivery Point Pins
    deliveryPoints.forEach((point) => {
      const isSelected = selectedPointId === point.pointId;
      const isActive = point.isActive;
      const pinColor = isSelected ? '#2563eb' : isActive ? '#10b981' : '#f43f5e';

      const pinHtml = `
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${pinColor};
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'leaflet-delivery-pin',
        html: pinHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; padding: 3px; min-width: 170px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; line-height: 1.3;">${escapeHtml(point.pointName)}</div>
          <div style="color: #64748b; margin-top: 4px; font-size: 11px; line-height: 1.4;">${escapeHtml(point.address)}</div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
            <span style="font-family: monospace; color: #475569;">${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}</span>
            <span style="color: ${isActive ? '#059669' : '#dc2626'}; font-weight: 700;">
              ${isActive ? 'Hoạt động' : 'Tạm dừng'}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedPointInfo(point);
        if (interactive && onSelectPoint) {
          onSelectPoint(point);
        }
      });

      layerGroup.addLayer(marker);
    });

    // 2. Start Point (Green Badge)
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'leaflet-start-badge',
        html: `
          <div style="
            background: #16a34a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            🟢 Xuất phát
          </div>
        `,
        iconAnchor: [42, 28],
      });

      const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon });
      layerGroup.addLayer(startMarker);
    }

    // 3. End Point (Red Badge)
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'leaflet-end-badge',
        html: `
          <div style="
            background: #dc2626;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            🔴 Đích đến
          </div>
        `,
        iconAnchor: [40, 28],
      });

      const endMarker = L.marker([endPoint.latitude, endPoint.longitude], { icon: endIcon });
      layerGroup.addLayer(endMarker);
    }

    // 4. Dijkstra Shortest Route Polyline
    if (routeCoordinates && routeCoordinates.length > 1) {
      const latLngs = routeCoordinates.map((c) => [c.latitude, c.longitude] as [number, number]);

      // Outer glow line
      const glowLine = L.polyline(latLngs, {
        color: '#60a5fa',
        weight: 10,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Main core line
      const mainLine = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });

      layerGroup.addLayer(glowLine);
      layerGroup.addLayer(mainLine);

      // Auto fit map bounds with comfortable padding
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [deliveryPoints, routeCoordinates, startPoint, endPoint, selectedPointId, interactive, onSelectPoint]);

  // Center map on HCMC
  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([DEFAULT_HCMC_CENTER.lat, DEFAULT_HCMC_CENTER.lng], DEFAULT_ZOOM);
    }
  };

  return (
    <div className={`relative ${className} rounded-2xl overflow-hidden shadow-xs border border-slate-200 flex flex-col bg-slate-100`}>
      {/* Top Controls Toolbar */}
      {showLayerSwitcher && (
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Left badge */}
          <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-xs font-bold text-slate-800 shadow-md border border-slate-200">
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Bản đồ Leaflet (TP. Hồ Chí Minh)</span>
          </div>

          {/* Right Layer Switcher Buttons */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-xs">
            <button
              onClick={() => setActiveLayer('streets')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeLayer === 'streets'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Đường phố
            </button>

            <button
              onClick={() => setActiveLayer('satellite')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeLayer === 'satellite'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Vệ tinh
            </button>

            <button
              onClick={handleResetCenter}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition ml-1"
              title="Về trung tâm TP.HCM"
              aria-label="Về trung tâm TP.HCM"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 min-h-[420px] z-0" />
    </div>
  );
};

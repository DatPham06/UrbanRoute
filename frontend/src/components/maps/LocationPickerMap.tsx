import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { DEFAULT_HCMC_CENTER, DEFAULT_ZOOM } from '../../config/api';
import { Crosshair } from 'lucide-react';

export interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onChange,
  className = 'w-full h-64 sm:h-72',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState({ lat: latitude, lng: longitude });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initLat = !isNaN(latitude) && latitude !== 0 ? latitude : DEFAULT_HCMC_CENTER.lat;
      const initLng = !isNaN(longitude) && longitude !== 0 ? longitude : DEFAULT_HCMC_CENTER.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initLat, initLng],
        zoom: DEFAULT_ZOOM,
        maxZoom: 20,
        minZoom: 9,
        zoomControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 20,
      }).addTo(map);

      // Draggable custom marker pin
      const pinHtml = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
        ">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'picker-pin',
        html: pinHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([initLat, initLng], {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const lat = Number(pos.lat.toFixed(6));
        const lng = Number(pos.lng.toFixed(6));
        setCurrentCoords({ lat, lng });
        onChange(lat, lng);
      });

      // Click anywhere on map to move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        marker.setLatLng([lat, lng]);
        setCurrentCoords({ lat, lng });
        onChange(lat, lng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync external lat/lng changes
  useEffect(() => {
    if (!isNaN(latitude) && !isNaN(longitude) && markerRef.current) {
      const current = markerRef.current.getLatLng();
      if (Math.abs(current.lat - latitude) > 0.0001 || Math.abs(current.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        setCurrentCoords({ lat: latitude, lng: longitude });
        mapInstanceRef.current?.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  return (
    <div className={`relative ${className} rounded-xl overflow-hidden border border-slate-200 shadow-inner flex flex-col bg-slate-100`}>
      {/* Top Banner */}
      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-slate-700 shadow-sm border border-slate-200 flex items-center gap-1.5 pointer-events-none">
        <Crosshair className="w-3.5 h-3.5 text-blue-600" />
        <span>Bấm vào bản đồ hoặc kéo ghim để chọn vị trí</span>
      </div>

      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Bottom Coordinate readout */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between px-3 z-10">
        <span>Tọa độ đã chọn:</span>
        <span className="font-mono text-blue-400 font-bold">
          {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
        </span>
      </div>
    </div>
  );
};

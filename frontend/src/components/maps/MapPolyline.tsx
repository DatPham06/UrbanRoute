import { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

export interface MapPolylineProps {
  path: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}

export const MapPolyline: React.FC<MapPolylineProps> = ({
  path,
  strokeColor = '#2563eb', // Blue-600
  strokeWeight = 5,
  strokeOpacity = 0.85,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const line = new google.maps.Polyline({
      map,
      path,
      strokeColor,
      strokeWeight,
      strokeOpacity,
      geodesic: true,
    });

    setPolyline(line);

    // Auto fit bounds
    if (path.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }

    return () => {
      line.setMap(null);
    };
  }, [map, mapsLib, path, strokeColor, strokeWeight, strokeOpacity]);

  return null;
};

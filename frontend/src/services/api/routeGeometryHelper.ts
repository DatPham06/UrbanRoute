import { RouteCoordinate } from '../../types';

/**
 * Fetches real road-snapped polyline coordinates following actual streets,
 * turns, intersections, and curves in Ho Chi Minh City via OpenStreetMap routing.
 * Falls back safely if offline or request times out.
 */
export async function fetchRoadSnappedCoordinates(
  waypoints: Array<{ latitude: number; longitude: number }>
): Promise<{ coordinates: RouteCoordinate[]; distanceMeters?: number } | null> {
  if (!waypoints || waypoints.length < 2) return null;

  try {
    // Limit waypoints to avoid overly long URLs
    const sampleWaypoints = waypoints.length > 25
      ? [waypoints[0], ...waypoints.slice(1, -1).filter((_, i) => i % Math.ceil(waypoints.length / 20) === 0), waypoints[waypoints.length - 1]]
      : waypoints;

    const coordsQuery = sampleWaypoints
      .map((w) => `${w.longitude.toFixed(6)},${w.latitude.toFixed(6)}`)
      .join(';');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
      const detailedCoords: RouteCoordinate[] = rawCoords.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      }));
      const actualDistance = Math.round(data.routes[0].distance || 0);
      return {
        coordinates: detailedCoords,
        distanceMeters: actualDistance,
      };
    }
  } catch (err) {
    console.warn('Could not fetch detailed street curvature; falling back to node geometry:', err);
  }

  return null;
}

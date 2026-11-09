/**
 * Form and coordinate validation logic
 */

export interface CoordinateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates latitude value (-90 to +90)
 */
export function validateLatitude(lat: number | string): CoordinateValidationResult {
  const num = typeof lat === 'string' ? parseFloat(lat) : lat;
  if (isNaN(num)) {
    return { isValid: false, error: 'Vĩ độ phải là một số hợp lệ' };
  }
  if (num < -90 || num > 90) {
    return { isValid: false, error: 'Vĩ độ phải nằm trong khoảng từ -90 đến 90' };
  }
  return { isValid: true };
}

/**
 * Validates longitude value (-180 to +180)
 */
export function validateLongitude(lng: number | string): CoordinateValidationResult {
  const num = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (isNaN(num)) {
    return { isValid: false, error: 'Kinh độ phải là một số hợp lệ' };
  }
  if (num < -180 || num > 180) {
    return { isValid: false, error: 'Kinh độ phải nằm trong khoảng từ -180 đến 180' };
  }
  return { isValid: true };
}

/**
 * Validates whether coordinates are within the approximate TP.HCM area
 */
export function isWithinHcmcRegion(lat: number, lng: number): boolean {
  // TP. Hồ Chí Minh approximate bounding box (including suburbs: Cu Chi, Can Gio, Thu Duc)
  const minLat = 10.35;
  const maxLat = 11.20;
  const minLng = 106.35;
  const maxLng = 107.05;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Validates delivery point selection for POINT_TO_POINT routing
 */
export function validatePointToPointSelection(
  startPointId?: number | null,
  endPointId?: number | null
): { isValid: boolean; error?: string } {
  if (!startPointId) {
    return { isValid: false, error: 'Vui lòng chọn điểm xuất phát' };
  }
  if (!endPointId) {
    return { isValid: false, error: 'Vui lòng chọn điểm đích' };
  }
  if (startPointId === endPointId) {
    return { isValid: false, error: 'Điểm xuất phát và điểm đích không được trùng nhau' };
  }
  return { isValid: true };
}

/**
 * Calculates Euclidean / Haversine distance in meters between two lat/lng points
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

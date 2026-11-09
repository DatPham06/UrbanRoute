/**
 * Formatting utilities for distance, currency, date, and status.
 */

import type { RouteStatus, SearchType } from '../types/index.ts';

/**
 * Formats distance in meters to a human-readable Vietnamese string.
 * Converts >= 1000m to km with up to 2 decimal places.
 */
export function formatDistance(meters?: number | null): string {
  if (meters === undefined || meters === null || isNaN(meters)) {
    return '0 m';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const formatted = parseFloat(km.toFixed(2)).toString();
  return `${formatted} km`;
}

/**
 * Formats ISO date-time string to readable Vietnamese date-time.
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formats short date for charts and tables (DD/MM).
 */
export function formatShortDate(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Search type human-readable label
 */
export function getSearchTypeLabel(type: SearchType): string {
  switch (type) {
    case 'CURRENT_TO_POINT':
      return 'Vị trí hiện tại → Điểm đến';
    case 'POINT_TO_POINT':
      return 'Điểm xuất phát → Điểm đến';
    default:
      return type;
  }
}

/**
 * Route status badge configuration
 */
export function getStatusBadgeConfig(status: RouteStatus): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
} {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Thành công', variant: 'success' };
    case 'NO_PATH':
      return { label: 'Không tìm thấy tuyến', variant: 'warning' };
    case 'FAILED':
      return { label: 'Lỗi xử lý', variant: 'danger' };
    default:
      return { label: status, variant: 'info' };
  }
}

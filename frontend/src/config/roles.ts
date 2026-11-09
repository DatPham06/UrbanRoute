import { UserRole } from '../types';

/**
 * Centralized Role Configuration & Label Mapping
 * In Oracle DB 23ai: role may be stored as 'ADMIN' or 'USER' or 'DRIVER'
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DRIVER: 'Tài xế',
  USER: 'Tài xế', // DB stores USER for driver
};

export function getRoleLabel(role: UserRole | string): string {
  return ROLE_LABELS[role.toUpperCase()] || 'Người dùng';
}

/**
 * Normalizes role string to canonical enum ('ADMIN' or 'DRIVER')
 */
export function normalizeRole(role: UserRole | string): 'ADMIN' | 'DRIVER' {
  const upper = (role || '').toUpperCase();
  if (upper === 'ADMIN') {
    return 'ADMIN';
  }
  return 'DRIVER';
}

export function isAdmin(role?: UserRole | string): boolean {
  if (!role) return false;
  return normalizeRole(role) === 'ADMIN';
}

export function isDriver(role?: UserRole | string): boolean {
  if (!role) return false;
  return normalizeRole(role) === 'DRIVER';
}

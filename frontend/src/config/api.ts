/**
 * API and Environment Configuration
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Connect to Spring Boot by default; mock data is an explicit opt-in.
export const USE_MOCK_API: boolean = import.meta.env.VITE_USE_MOCK_API === 'true';

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// App Defaults for Ho Chi Minh City
export const DEFAULT_HCMC_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
};

export const DEFAULT_ZOOM = 13;

/**
 * API Configuration
 * Centralized API base URL configuration using environment variables
 */

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// For client-side code in Next.js, we need NEXT_PUBLIC_ prefix
// Use BACKEND_PROD_BASE_URL from .env file, or localhost for development
export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_BACKEND_PROD_BASE_URL || 
  (isDevelopment ? 'http://localhost:3001' : 'http://localhost:3001');

// API base URL with /api suffix for convenience
export const API_BASE_URL_WITH_API = `${API_BASE_URL}/api`;

/** Backend v1 routes (e.g. `/api/v1/reports/...`) */
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

// For server-side code (API routes), we can use the env var directly without NEXT_PUBLIC_ prefix
// Fallback to NEXT_PUBLIC_ version if direct version is not available
// Use localhost for development if no env var is set
export const SERVER_API_BASE_URL = 
  process.env.BACKEND_PROD_BASE_URL || 
  process.env.NEXT_PUBLIC_BACKEND_PROD_BASE_URL || 
  (isDevelopment ? 'http://localhost:3001' : 'http://localhost:3001');

export const SERVER_API_BASE_URL_WITH_API = `${SERVER_API_BASE_URL}/api`;

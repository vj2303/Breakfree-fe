/**
 * API Configuration
 * Centralized API base URL configuration using environment variables
 * 
 * Single env var: NEXT_PUBLIC_BACKEND_URL
 * - Set in .env for local dev (http://localhost:3001)
 * - Set in Vercel env vars for production (e.g. https://chatapi-ntky.onrender.com)
 * 
 * NEXT_PUBLIC_ prefix makes it available in both client-side and server-side code.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Base URL without /api suffix
export const API_BASE_URL = BACKEND_URL;

// API base URL with /api suffix for convenience
export const API_BASE_URL_WITH_API = `${BACKEND_URL}/api`;

/** Backend v1 routes (e.g. `/api/v1/reports/...`) */
export const API_V1_BASE_URL = `${BACKEND_URL}/api/v1`;

// Server-side uses the same URL (NEXT_PUBLIC_ vars are available server-side too)
export const SERVER_API_BASE_URL = BACKEND_URL;

export const SERVER_API_BASE_URL_WITH_API = `${BACKEND_URL}/api`;

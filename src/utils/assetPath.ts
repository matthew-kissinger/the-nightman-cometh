/// <reference types="vite/client" />

/**
 * Asset path utility - handles base URL for GitHub Pages deployment
 */

// Vite provides BASE_URL from vite.config.js
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Get the full path to an asset
 * @param path - The asset path starting with /assets/...
 * @returns The full path with base URL prepended
 */
export function assetPath(path: string): string {
  // Remove leading slash if present since BASE_URL ends with /
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Spatial Geographic Projection Engine
 *
 * This feature provides deterministic 2D cartographic projections for mapping geographical
 * coordinates (latitude and longitude) to standard SVG viewport coordinates across the
 * continental United States (Lower 48).
 *
 * Feature Overview & Use Cases:
 * 1. Geographic Boundary Transformation: Linearly scales coordinates between the westernmost
 *    and easternmost extents of the continental US into a high-resolution SVG canvas.
 * 2. Visual Collision Disambiguation: Applies a deterministic radial offset when multiple facilities
 *    reside within the exact same city or municipality (e.g., Santa Clara, CA or Ashburn, VA)
 *    so every facility pin and tooltip remains distinctly visible and clickable.
 * 3. Bounded Viewport Clamping: Prevents visual clipping along the outer canvas boundaries.
 */

import { CONFIG } from '../config/appConfig';
import { logFunctionCall } from '../utils/logger';

export interface ProjectCoordsResult {
  x: number;
  y: number;
}

/**
 * Converts geographic latitude and longitude into 2D SVG canvas coordinates
 * with deterministic radial spacing for co-located facilities.
 *
 * @param lat Latitude in decimal degrees (e.g., 37.37 for Santa Clara, CA).
 * @param lng Longitude in decimal degrees (e.g., -121.96 for Santa Clara, CA).
 * @param offsetIdx Zero-based index indicating how many facilities share this locality.
 * @returns Projected { x, y } screen coordinates clamped within the SVG canvas boundaries.
 */
export function projectLatLng(
  lat: number,
  lng: number,
  offsetIdx = 0
): ProjectCoordsResult {
  logFunctionCall('projectLatLng', { lat, lng, offsetIdx });

  const {
    MIN_LNG,
    MAX_LNG,
    MIN_LAT,
    MAX_LAT,
    OFFSET_X,
    SCALE_X,
    OFFSET_Y,
    SCALE_Y,
  } = CONFIG.SPATIAL_PROJECTION;

  const normX = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG);
  const normY = 1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT);

  // Deterministic radial offset for co-located campuses
  const angle = offsetIdx * 2.15;
  const radius = offsetIdx === 0 ? 0 : 14 + (offsetIdx % 2) * 6;

  const rawX = OFFSET_X + normX * SCALE_X + Math.cos(angle) * radius;
  const rawY = OFFSET_Y + normY * SCALE_Y + Math.sin(angle) * radius;

  return {
    x: Math.max(45, Math.min(905, rawX)),
    y: Math.max(40, Math.min(515, rawY)),
  };
}

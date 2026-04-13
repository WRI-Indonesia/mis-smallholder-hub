/**
 * Utility functions for MapLibre & Turf.js
 */

export const REGION_COORDINATES: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  "All": { longitude: 101.44, latitude: 0.53, zoom: 7.2 },
  "Kampar": { longitude: 101.03, latitude: 0.33, zoom: 9 },
  "Siak": { longitude: 102.04, latitude: 0.75, zoom: 9 },
  "Pelalawan": { longitude: 101.99, latitude: 0.30, zoom: 9 },
  "Rokan Hulu": { longitude: 100.32, latitude: 0.84, zoom: 9 },
};

export function calculatePolygonArea() {
  // TODO: Implement using @turf/area
  return 0;
}

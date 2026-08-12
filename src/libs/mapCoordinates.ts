export type MapCoordinates = {
  zoom: number
  lat: number
  lng: number
};

function validCoordinates(zoom: number, lat: number, lng: number): MapCoordinates | null {
  if (![zoom, lat, lng].every(Number.isFinite)) return null;
  if (zoom < 0 || zoom > 24 || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {zoom, lat, lng};
}

/**
 * Parses MapLibre hashes and coordinate strings used by map QA tools.
 * Supported forms: zoom/lat/lng, #zoom/lat/lng, full URLs containing that
 * hash, and lat,lng (using the provided fallback zoom).
 */
export function parseMapCoordinates(input: string, fallbackZoom = 12): MapCoordinates | null {
  let value = input.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).hash;
    } catch {
      return null;
    }
  }

  value = value.replace(/^#/, "").trim();
  const slashParts = value.split("/").map(part => part.trim());
  if (slashParts.length >= 3) {
    return validCoordinates(Number(slashParts[0]), Number(slashParts[1]), Number(slashParts[2]));
  }

  const coordinateParts = value.split(/[\s,]+/).filter(Boolean);
  if (coordinateParts.length === 2) {
    return validCoordinates(fallbackZoom, Number(coordinateParts[0]), Number(coordinateParts[1]));
  }

  return null;
}

export function formatMapCoordinates(coordinates: MapCoordinates): string {
  // Round for display — raw map state carries 15-decimal float noise.
  const zoom = Number(coordinates.zoom.toFixed(2));
  const lat = Number(coordinates.lat.toFixed(4));
  const lng = Number(coordinates.lng.toFixed(4));
  return `${zoom}/${lat}/${lng}`;
}

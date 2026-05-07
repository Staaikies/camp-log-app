/** Set `VITE_GOOGLE_MAPS_API_KEY` in `apps/web/.env` for the map (enable Maps JavaScript API + Geocoding API for search). */
export function getGoogleMapsApiKey(): string | undefined {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  return k || undefined;
}

/** Vector Map ID from Google Cloud (Maps → Map Management). Improves Advanced Marker behaviour. */
export function getGoogleMapId(): string | undefined {
  const m = import.meta.env.VITE_GOOGLE_MAP_ID?.trim();
  return m || undefined;
}

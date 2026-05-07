/**
 * Opens Google Maps directions to the trip location (lat/lng preferred, else place name).
 * Works in mobile browsers / WebViews and hands off to the Google Maps app when installed.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started
 */
export function getGoogleMapsDirectionsUrl(input: {
  latitude: number | null;
  longitude: number | null;
  placeName?: string | null;
}): string | null {
  const { latitude, longitude, placeName } = input;
  const base = "https://www.google.com/maps/dir/?api=1";

  if (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return `${base}&destination=${latitude},${longitude}`;
  }

  const q = placeName?.trim();
  if (q) {
    return `${base}&destination=${encodeURIComponent(q)}`;
  }

  return null;
}

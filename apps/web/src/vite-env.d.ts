/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JavaScript API key (Maps JavaScript API enabled in Cloud Console). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Optional Map ID for vector maps + Advanced Markers (recommended). */
  readonly VITE_GOOGLE_MAP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

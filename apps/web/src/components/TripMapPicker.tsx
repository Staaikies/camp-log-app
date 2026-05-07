import {
  AdvancedMarker,
  APIProvider,
  Map,
  Marker,
  Pin,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getGoogleMapId, getGoogleMapsApiKey } from "@/lib/env";

export type LatLng = { lat: number; lng: number };

const mapAreaClass =
  "w-full overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--panel))]";

const MAP_ZOOM = 13;
const SEARCH_ZOOM = 15;

async function getCurrentPositionFromDevice(): Promise<{ lat: number; lng: number }> {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      throw new Error("Location permission was denied.");
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 120_000,
      timeout: 12_000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  return await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Could not access your location.")),
      { enableHighAccuracy: true, maximumAge: 120_000, timeout: 12_000 },
    );
  });
}

function ManualCoordinates({
  position,
  onChange,
}: {
  position: LatLng;
  onChange: (next: LatLng) => void;
}) {
  const latId = useId();
  const lngId = useId();

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] p-4">
      <div className="flex items-start gap-2 text-sm text-[rgb(var(--muted))]">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--muted-2))]" aria-hidden />
        <p>
          Add{" "}
          <code className="rounded bg-[rgb(var(--bg)/0.6)] px-1.5 py-0.5 text-[rgb(var(--accent))]">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{" "}
          in{" "}
          <code className="rounded bg-[rgb(var(--bg)/0.6)] px-1.5 py-0.5 text-[rgb(var(--accent))]">
            apps/web/.env
          </code>{" "}
          for the map and
          search. Enable the Geocoding API on the same Google Cloud
          project. For pins, add{" "}
          <code className="text-[rgb(var(--accent))]">VITE_GOOGLE_MAP_ID</code> in Google Cloud → Map
          Management.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={latId} className="mb-1 block text-xs text-[rgb(var(--muted-2))]">
            Latitude
          </label>
          <input
            id={latId}
            type="number"
            step="any"
            min={-90}
            max={90}
            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.35)] px-3 py-2 font-mono text-sm text-[rgb(var(--fg))]"
            value={Number.isFinite(position.lat) ? position.lat : ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              onChange({ lat: v, lng: position.lng });
            }}
          />
        </div>
        <div>
          <label htmlFor={lngId} className="mb-1 block text-xs text-[rgb(var(--muted-2))]">
            Longitude
          </label>
          <input
            id={lngId}
            type="number"
            step="any"
            min={-180}
            max={180}
            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.35)] px-3 py-2 font-mono text-sm text-[rgb(var(--fg))]"
            value={Number.isFinite(position.lng) ? position.lng : ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              onChange({ lat: position.lat, lng: v });
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Search using Geocoder — enable Geocoding API in Google Cloud. */
function LocationSearchBar({
  onResolved,
  onUseCurrentLocation,
}: {
  onResolved: (lat: number, lng: number) => void;
  onUseCurrentLocation: () => void;
}) {
  const loaded = useApiIsLoaded();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const q = query.trim();
    if (!loaded || !q) return;
    setBusy(true);
    setError(null);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: q }, (results, status) => {
      setBusy(false);
      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        setError(
          status === "ZERO_RESULTS"
            ? "No results—try a broader search."
            : "Geocoding failed. Enable Geocoding API for this key and try again.",
        );
        return;
      }
      const loc = results[0].geometry.location;
      onResolved(loc.lat(), loc.lng());
    });
  };

  return (
    <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.7)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={searchId} className="sr-only">
          Search location
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
          placeholder="Search city, park, address…"
          disabled={!loaded || busy}
          className="min-w-[10rem] flex-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted-2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent)/0.4)]"
        />
        <Button type="button" size="sm" disabled={!loaded || busy} onClick={run}>
          <Search className="h-4 w-4" />
          {busy ? "…" : "Search"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onUseCurrentLocation}>
          <LocateFixed className="h-4 w-4" />
          Use my location
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-amber-600" role="alert">
          {error}
        </p>
      ) : null}
      {!loaded ? <p className="mt-1 text-xs text-[rgb(var(--muted-2))]">Loading maps…</p> : null}
    </div>
  );
}

type Camera = { center: LatLng; zoom: number };

function GoogleMapShell({
  position,
  onChange,
  mapId,
  useAdvanced,
}: {
  position: LatLng;
  onChange: (next: LatLng) => void;
  mapId: string | undefined;
  useAdvanced: boolean;
}) {
  const skipCameraSyncRef = useRef(false);
  const requestedCurrentLocationRef = useRef(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>(() => ({
    center: { lat: position.lat, lng: position.lng },
    zoom: MAP_ZOOM,
  }));

  // Keep map view in sync when the pin moves (geolocation, marker, click, typed coords)—
  // but skip one frame after search so we can apply SEARCH_ZOOM without this effect overwriting it.
  useEffect(() => {
    if (skipCameraSyncRef.current) {
      skipCameraSyncRef.current = false;
      return;
    }
    setCamera((prev) => ({
      center: { lat: position.lat, lng: position.lng },
      zoom: prev.zoom,
    }));
  }, [position.lat, position.lng]);

  const onSearchResolved = (lat: number, lng: number) => {
    skipCameraSyncRef.current = true;
    onChange({ lat, lng });
    setCamera({ center: { lat, lng }, zoom: SEARCH_ZOOM });
  };

  const requestCurrentLocation = () => {
    setGeoError(null);
    void getCurrentPositionFromDevice()
      .then(({ lat, lng }) => {
        onSearchResolved(lat, lng);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not access your location.";
        setGeoError("Could not access your location. You can still search or place the pin manually.");
        if (message.toLowerCase().includes("denied")) {
          setGeoError("Location permission is off. Enable it for Camp Log to use your current location.");
        }
      });
  };

  useEffect(() => {
    const isZeroPin = Math.abs(position.lat) < 0.000001 && Math.abs(position.lng) < 0.000001;
    if (!isZeroPin || requestedCurrentLocationRef.current) return;
    requestedCurrentLocationRef.current = true;
    requestCurrentLocation();
  }, [position.lat, position.lng]);

  return (
    <>
      <LocationSearchBar onResolved={onSearchResolved} onUseCurrentLocation={requestCurrentLocation} />
      {geoError ? (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700">
          {geoError}
        </p>
      ) : null}
      <Map
        mapId={mapId}
        colorScheme="FOLLOW_SYSTEM"
        center={camera.center}
        zoom={camera.zoom}
        gestureHandling="greedy"
        style={{ width: "100%", height: 280 }}
        onCameraChanged={(e) => {
          const d = e.detail;
          setCamera({
            center: d.center,
            zoom: d.zoom,
          });
        }}
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll) onChange({ lat: ll.lat, lng: ll.lng });
        }}
      >
        {useAdvanced ? (
          <AdvancedMarker
            position={position}
            draggable
            onDragEnd={(e) => {
              const ll = e.latLng;
              if (!ll) return;
              onChange({ lat: ll.lat(), lng: ll.lng() });
            }}
          >
            <Pin background="rgb(var(--accent-2))" borderColor="rgb(var(--accent))" glyphColor="#ffffff" />
          </AdvancedMarker>
        ) : (
          <Marker
            position={position}
            draggable
            onDragEnd={(e) => {
              const ll = e.latLng;
              if (!ll) return;
              onChange({ lat: ll.lat(), lng: ll.lng() });
            }}
          />
        )}
      </Map>
    </>
  );
}

export function TripMapPicker({
  position,
  onChange,
}: {
  position: LatLng;
  onChange: (next: LatLng) => void;
}) {
  const apiKey = getGoogleMapsApiKey();
  const mapId = getGoogleMapId();
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!apiKey) {
    return (
      <div className={mapAreaClass}>
        <ManualCoordinates position={position} onChange={onChange} />
      </div>
    );
  }

  const useAdvanced = Boolean(mapId);

  return (
    <div className={mapAreaClass}>
      <APIProvider
        apiKey={apiKey}
        libraries={["marker"]}
        onLoad={() => setLoadError(null)}
        onError={(err) =>
          setLoadError(err instanceof Error ? err.message : "Could not load Google Maps")
        }
      >
        {loadError ? (
          <div className="border-b border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{loadError}</div>
        ) : null}
        <GoogleMapShell
          position={position}
          onChange={onChange}
          mapId={mapId}
          useAdvanced={useAdvanced}
        />
      </APIProvider>
      <p className="border-t border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--muted-2))]">
        Pan and zoom the map freely. Drag the pin, click the map, or search to set the campsite.
        {!mapId ? (
          <>
            {" "}
            If the pin does not show, add{" "}
            <code className="text-[rgb(var(--accent))]">VITE_GOOGLE_MAP_ID</code> in{" "}
            <code className="text-[rgb(var(--accent))]">apps/web/.env</code>.
          </>
        ) : null}
      </p>
    </div>
  );
}

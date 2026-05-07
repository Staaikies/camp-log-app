import type { TripInput } from "@camp-log/contracts";
import { useSyncExternalStore } from "react";

import { randomId } from "@/lib/random-id";

export const LOCAL_TRIPS_STORAGE_KEY = "camp-log:v1:trips";
const CHANGED_EVENT = "camp-log-local-trips-changed";

/** One dated stay at this place (same trip / location can have many). */
export type TripVisit = {
  id: string;
  startDate: string;
  endDate: string;
  /** Notes specific to this stay (optional). */
  notes: string;
};

export type LocalTrip = {
  id: string;
  title: string;
  /** Overall span across all visits (earliest start → latest end); kept for sync/list sorting helpers. */
  startDate: string;
  endDate: string;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  notes: string;
  rating: number;
  isFavourite: boolean;
  tags: string[];
  /** JPEG data URLs, browser-only; keep total size reasonable. */
  photoDataUrls: string[];
  /** Index into `photoDataUrls` for list/detail cover; `null` = use most recently added (last item). */
  thumbnailPhotoIndex: number | null;
  /** Photo indices the user marked as favourites (homepage gallery); sorted ascending. */
  favouritePhotoIndices: number[];
  /** Each time you stayed at this place; sorted by startDate ascending after normalize. */
  visits: TripVisit[];
  createdAt: string;
  updatedAt: string;
};

function parseStored(raw: string | null): LocalTrip[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: LocalTrip[] = [];
    for (const row of data) {
      if (!isTripLike(row)) continue;
      try {
        out.push(normalizeTrip(row));
      } catch {
        /* skip one corrupt row; keep the rest */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function normalizeFavouritePhotoIndices(
  raw: readonly number[] | undefined,
  photoCount: number,
): number[] {
  if (!raw?.length || photoCount === 0) return [];
  const set = new Set<number>();
  for (const n of raw) {
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < photoCount) {
      set.add(n);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** After removing the photo at `removedIndex`, remap favourite indices. */
export function adjustFavouritePhotoIndicesOnRemove(
  indices: readonly number[],
  removedIndex: number,
): number[] {
  return indices
    .filter((i) => i !== removedIndex)
    .map((i) => (i > removedIndex ? i - 1 : i));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTripSpanFromVisits(visits: readonly TripVisit[]): {
  startDate: string;
  endDate: string;
} {
  if (visits.length === 0) {
    const t = todayIsoDate();
    return { startDate: t, endDate: t };
  }
  let minS = visits[0].startDate;
  let maxE = visits[0].endDate;
  for (const v of visits) {
    if (v.startDate < minS) minS = v.startDate;
    if (v.endDate > maxE) maxE = v.endDate;
  }
  return { startDate: minS, endDate: maxE };
}

/** Most recent stay by end date (ties broken by start date). */
export function getLastVisit(trip: LocalTrip): TripVisit | null {
  if (trip.visits.length === 0) return null;
  return [...trip.visits].sort((a, b) => {
    const c = b.endDate.localeCompare(a.endDate);
    if (c !== 0) return c;
    return b.startDate.localeCompare(a.startDate);
  })[0]!;
}

export function getTripVisitsChronological(trip: LocalTrip): TripVisit[] {
  return [...trip.visits].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getLastVisitEndForSort(trip: LocalTrip): string {
  return getLastVisit(trip)?.endDate ?? trip.endDate;
}

/** Subtitle for list cards and home: visit count + last stay, or a single date range. */
export function formatTripListDateLine(trip: LocalTrip): string {
  const n = trip.visits.length;
  const last = getLastVisit(trip);
  if (!last) return `${trip.startDate} → ${trip.endDate}`;
  const range = `${last.startDate} → ${last.endDate}`;
  if (n <= 1) return range;
  return `${n} visits · Last: ${range}`;
}

function parseVisitRecord(
  x: unknown,
  fallbackStart: string,
  fallbackEnd: string,
): TripVisit | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.length > 0 ? o.id : randomId();
  const fs = ISO_DATE.test(fallbackStart) ? fallbackStart : todayIsoDate();
  const fe = ISO_DATE.test(fallbackEnd) ? fallbackEnd : fs;
  let startDate = typeof o.startDate === "string" && ISO_DATE.test(o.startDate) ? o.startDate : fs;
  let endDate = typeof o.endDate === "string" && ISO_DATE.test(o.endDate) ? o.endDate : fe;
  if (startDate > endDate) {
    const swap = startDate;
    startDate = endDate;
    endDate = swap;
  }
  const notes = typeof o.notes === "string" ? o.notes.slice(0, 20_000) : "";
  return { id, startDate, endDate, notes };
}

function normalizeVisitsFromStored(
  raw: unknown,
  fallbackStart: string,
  fallbackEnd: string,
): TripVisit[] {
  const fs = ISO_DATE.test(fallbackStart) ? fallbackStart : todayIsoDate();
  const fe = ISO_DATE.test(fallbackEnd) ? fallbackEnd : fs;

  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ id: randomId(), startDate: fs, endDate: fe, notes: "" }];
  }
  const out: TripVisit[] = [];
  for (const item of raw) {
    const v = parseVisitRecord(item, fs, fe);
    if (v) out.push(v);
  }
  if (out.length === 0) {
    return [{ id: randomId(), startDate: fs, endDate: fe, notes: "" }];
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Normalize visits from the editor before save (sort + clamp notes). */
export function normalizeTripVisitsForSave(visits: readonly TripVisit[]): TripVisit[] {
  const cleaned = visits.map((v) => ({
    id: v.id || randomId(),
    startDate: v.startDate,
    endDate: v.endDate,
    notes: v.notes.slice(0, 20_000),
  }));
  return cleaned.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function normalizeNumberOrNull(
  n: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function normalizePlaceName(p: unknown): string | null {
  if (p == null) return null;
  if (typeof p === "string") {
    const s = p.trim();
    return s ? s : null;
  }
  if (typeof p === "number" || typeof p === "boolean") {
    return String(p);
  }
  return null;
}

function normalizeTagList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

function normalizeTrip(t: LocalTrip): LocalTrip {
  const title = typeof t.title === "string" ? t.title : "";
  const notes = typeof t.notes === "string" ? t.notes : "";
  const tags = normalizeTagList(t.tags);
  const placeName = normalizePlaceName(t.placeName);
  const latitude = normalizeNumberOrNull(t.latitude, -90, 90);
  const longitude = normalizeNumberOrNull(t.longitude, -180, 180);

  const photoDataUrls = Array.isArray(t.photoDataUrls)
    ? t.photoDataUrls.filter((u) => typeof u === "string")
    : [];
  let thumbnailPhotoIndex: number | null =
    typeof t.thumbnailPhotoIndex === "number" && Number.isInteger(t.thumbnailPhotoIndex)
      ? t.thumbnailPhotoIndex
      : null;
  if (photoDataUrls.length === 0) {
    thumbnailPhotoIndex = null;
  } else if (
    thumbnailPhotoIndex !== null &&
    (thumbnailPhotoIndex < 0 || thumbnailPhotoIndex >= photoDataUrls.length)
  ) {
    thumbnailPhotoIndex = null;
  }
  const favouritePhotoIndices = normalizeFavouritePhotoIndices(
    t.favouritePhotoIndices,
    photoDataUrls.length,
  );
  const startDate = typeof t.startDate === "string" ? t.startDate : todayIsoDate();
  const endDate = typeof t.endDate === "string" ? t.endDate : startDate;
  const visits = normalizeVisitsFromStored(t.visits, startDate, endDate);
  const span = getTripSpanFromVisits(visits);
  let rating =
    typeof t.rating === "number" && Number.isInteger(t.rating) ? t.rating : 4;
  if (rating < 1) rating = 1;
  if (rating > 5) rating = 5;
  const isFavourite = typeof t.isFavourite === "boolean" ? t.isFavourite : false;
  const id = typeof t.id === "string" && t.id ? t.id : randomId();
  const createdAt = typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString();
  const updatedAt = typeof t.updatedAt === "string" ? t.updatedAt : createdAt;
  return {
    ...t,
    id,
    title,
    notes,
    tags,
    placeName,
    latitude,
    longitude,
    rating,
    isFavourite,
    createdAt,
    updatedAt,
    photoDataUrls,
    thumbnailPhotoIndex,
    favouritePhotoIndices,
    visits,
    startDate: span.startDate,
    endDate: span.endDate,
  };
}

function isTripLike(x: unknown): x is LocalTrip {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const photosOk =
    o.photoDataUrls === undefined ||
    (Array.isArray(o.photoDataUrls) && o.photoDataUrls.every((p) => typeof p === "string"));
  const thumbOk =
    o.thumbnailPhotoIndex === undefined ||
    o.thumbnailPhotoIndex === null ||
    (typeof o.thumbnailPhotoIndex === "number" && Number.isInteger(o.thumbnailPhotoIndex));
  const favPhotosOk =
    o.favouritePhotoIndices === undefined ||
    (Array.isArray(o.favouritePhotoIndices) &&
      o.favouritePhotoIndices.every((x) => typeof x === "number" && Number.isInteger(x)));
  const visitsOk = o.visits === undefined || Array.isArray(o.visits);
  return (
    photosOk &&
    thumbOk &&
    favPhotosOk &&
    visitsOk &&
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.startDate === "string" &&
    typeof o.endDate === "string" &&
    typeof o.notes === "string" &&
    typeof o.rating === "number" &&
    typeof o.isFavourite === "boolean" &&
    Array.isArray(o.tags) &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  );
}

/**
 * Cache parsed trips keyed by the raw localStorage string.
 * Required for useSyncExternalStore: getSnapshot must return the same reference when data is unchanged.
 */
let cachedRaw: string | null | undefined;
let cachedTrips: LocalTrip[] = [];

function readAll(): LocalTrip[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedTrips;
    }
    cachedRaw = raw;
    cachedTrips = parseStored(raw);
    return cachedTrips;
  } catch {
    /* Private mode / blocked storage / quota read issues on some mobile browsers */
    cachedRaw = null;
    cachedTrips = [];
    return [];
  }
}

function writeAll(trips: LocalTrip[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload = JSON.stringify(trips);
    localStorage.setItem(LOCAL_TRIPS_STORAGE_KEY, payload);
    cachedRaw = payload;
    cachedTrips = trips;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CHANGED_EVENT));
    }
  } catch {
    /* QuotaExceededError etc. — avoid crashing the UI */
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CHANGED_EVENT));
    }
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_TRIPS_STORAGE_KEY || e.key === null) callback();
  };
  const onLocal = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED_EVENT, onLocal);
  };
}

function getSnapshot(): LocalTrip[] {
  return readAll();
}

function getServerSnapshot(): LocalTrip[] {
  return [];
}

export function getLocalTrip(id: string): LocalTrip | undefined {
  return readAll().find((t) => t.id === id);
}

export type FavouritePhotoGalleryItem = {
  tripId: string;
  tripTitle: string;
  photoIndex: number;
  url: string;
};

/** Trips’ favourite photos for the homepage gallery (recently updated trips first). */
export function collectFavouritePhotoGalleryItems(
  trips: readonly LocalTrip[],
): FavouritePhotoGalleryItem[] {
  const byRecent = [...trips].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const out: FavouritePhotoGalleryItem[] = [];
  for (const trip of byRecent) {
    for (const i of trip.favouritePhotoIndices) {
      if (i >= 0 && i < trip.photoDataUrls.length) {
        out.push({
          tripId: trip.id,
          tripTitle: trip.title,
          photoIndex: i,
          url: trip.photoDataUrls[i]!,
        });
      }
    }
  }
  return out;
}

/** Most recently created trip (by `createdAt`). */
export function getLastAddedTrip(trips: readonly LocalTrip[]): LocalTrip | null {
  if (trips.length === 0) return null;
  return [...trips].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]!;
}

export function useLocalTripsSnapshot(): LocalTrip[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Remove one photo from a trip; keeps thumbnail and favourite indices consistent. */
export function removeLocalTripPhoto(tripId: string, photoIndex: number): LocalTrip | undefined {
  const all = readAll();
  const tIdx = all.findIndex((t) => t.id === tripId);
  if (tIdx === -1) return undefined;
  const trip = all[tIdx]!;
  if (photoIndex < 0 || photoIndex >= trip.photoDataUrls.length) return undefined;
  const nextUrls = trip.photoDataUrls.filter((_, i) => i !== photoIndex);
  let thumb = trip.thumbnailPhotoIndex;
  if (thumb !== null) {
    if (photoIndex === thumb) thumb = null;
    else if (photoIndex < thumb) thumb = thumb - 1;
  }
  if (nextUrls.length === 0) thumb = null;
  const favouritePhotoIndices = adjustFavouritePhotoIndicesOnRemove(
    trip.favouritePhotoIndices,
    photoIndex,
  );
  const updatedAt = new Date().toISOString();
  const next: LocalTrip = {
    ...trip,
    photoDataUrls: nextUrls,
    thumbnailPhotoIndex: thumb,
    favouritePhotoIndices: normalizeFavouritePhotoIndices(
      favouritePhotoIndices,
      nextUrls.length,
    ),
    updatedAt,
  };
  const copy = [...all];
  copy[tIdx] = next;
  writeAll(copy);
  return next;
}

/** Toggle a photo’s favourite flag without editing the full trip form. */
export function toggleLocalTripPhotoFavourite(
  tripId: string,
  photoIndex: number,
): LocalTrip | undefined {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === tripId);
  if (idx === -1) return undefined;
  const trip = all[idx]!;
  const len = trip.photoDataUrls.length;
  if (photoIndex < 0 || photoIndex >= len) return undefined;
  const set = new Set(trip.favouritePhotoIndices);
  if (set.has(photoIndex)) set.delete(photoIndex);
  else set.add(photoIndex);
  const favouritePhotoIndices = [...set].sort((a, b) => a - b);
  const updatedAt = new Date().toISOString();
  const next: LocalTrip = { ...trip, favouritePhotoIndices, updatedAt };
  const copy = [...all];
  copy[idx] = next;
  writeAll(copy);
  return next;
}

/** Image URL for trip list cards: chosen thumbnail, else last uploaded photo. */
export function getTripListThumbnailUrl(trip: LocalTrip): string | null {
  const { photoDataUrls } = trip;
  if (photoDataUrls.length === 0) return null;
  const i = trip.thumbnailPhotoIndex;
  if (i !== null && i >= 0 && i < photoDataUrls.length) {
    return photoDataUrls[i]!;
  }
  return photoDataUrls[photoDataUrls.length - 1]!;
}

export function appendLocalTrip(
  input: TripInput,
  photoDataUrls: readonly string[] = [],
  thumbnailPhotoIndex: number | null = null,
  favouritePhotoIndices: readonly number[] = [],
  visits: readonly TripVisit[] = [],
): LocalTrip {
  const id = input.id ?? randomId();
  const now = new Date().toISOString();
  const photos = [...photoDataUrls];
  const normalizedVisits = normalizeVisitsFromStored(visits, input.startDate, input.endDate);
  const span = getTripSpanFromVisits(normalizedVisits);
  const trip: LocalTrip = {
    id,
    title: input.title,
    startDate: span.startDate,
    endDate: span.endDate,
    latitude: input.latitude,
    longitude: input.longitude,
    placeName: input.placeName ?? null,
    notes: input.notes,
    rating: input.rating,
    isFavourite: input.isFavourite,
    tags: [...input.tagNames],
    photoDataUrls: photos,
    thumbnailPhotoIndex:
      thumbnailPhotoIndex !== null &&
      thumbnailPhotoIndex >= 0 &&
      thumbnailPhotoIndex < photos.length
        ? thumbnailPhotoIndex
        : null,
    favouritePhotoIndices: normalizeFavouritePhotoIndices(favouritePhotoIndices, photos.length),
    visits: normalizedVisits,
    createdAt: now,
    updatedAt: now,
  };
  const all = readAll();
  writeAll([...all, trip]);
  return trip;
}

export function updateLocalTrip(
  id: string,
  input: TripInput,
  photoDataUrls: readonly string[],
  thumbnailPhotoIndex: number | null,
  favouritePhotoIndices: readonly number[],
  visits: readonly TripVisit[],
): LocalTrip | undefined {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  const prev = all[idx]!;
  const updatedAt = new Date().toISOString();
  const photos = [...photoDataUrls];
  let thumb = thumbnailPhotoIndex;
  if (photos.length === 0) thumb = null;
  else if (thumb !== null && (thumb < 0 || thumb >= photos.length)) thumb = null;

  const normalizedVisits = normalizeVisitsFromStored(visits, input.startDate, input.endDate);
  const span = getTripSpanFromVisits(normalizedVisits);

  const next: LocalTrip = {
    ...prev,
    title: input.title,
    startDate: span.startDate,
    endDate: span.endDate,
    latitude: input.latitude,
    longitude: input.longitude,
    placeName: input.placeName ?? null,
    notes: input.notes,
    rating: input.rating,
    isFavourite: input.isFavourite,
    tags: [...input.tagNames],
    photoDataUrls: photos,
    thumbnailPhotoIndex: thumb,
    favouritePhotoIndices: normalizeFavouritePhotoIndices(favouritePhotoIndices, photos.length),
    visits: normalizedVisits,
    updatedAt,
  };
  const copy = [...all];
  copy[idx] = next;
  writeAll(copy);
  return next;
}

export function useLocalTripsList(options?: { favouritesOnly?: boolean }) {
  const rows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  let filtered = rows;
  if (options?.favouritesOnly) {
    filtered = filtered.filter((t) => t.isFavourite);
  }
  return [...filtered].sort((a, b) =>
    getLastVisitEndForSort(a) < getLastVisitEndForSort(b) ? 1 : -1,
  );
}

export function useLocalTrip(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (id ? getLocalTrip(id) : undefined),
    () => undefined,
  );
}

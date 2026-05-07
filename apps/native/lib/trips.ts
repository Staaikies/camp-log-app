import * as schema from "@/db/schema";

import type { TripInput } from "@camp-log/contracts";

import * as FileSystem from "expo-file-system/legacy";

import { enqueueOutbox } from "@/lib/outbox";

import { linkTripTags } from "@/lib/tagging";

import type { DrizzleSqliteDb } from "@/lib/trip-types";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

function nowIso() {
  return new Date().toISOString();
}

/** Drizzle subquery for active trips (for `useLiveQuery` or await). */
export function selectActiveTrips(
  db: DrizzleSqliteDb,
  options: { favouritesOnly?: boolean } = {},
) {
  return db
    .select()
    .from(schema.trips)
    .where(
      options.favouritesOnly
        ? and(
            isNull(schema.trips.deletedAt),
            eq(schema.trips.isFavourite, true),
          )
        : isNull(schema.trips.deletedAt),
    )
    .orderBy(desc(schema.trips.startDate));
}

export async function getTrip(db: DrizzleSqliteDb, id: string) {
  const [row] = await db
    .select()
    .from(schema.trips)
    .where(eq(schema.trips.id, id))
    .limit(1);
  if (!row || row.deletedAt) return null;
  return row;
}

export async function tagNamesForTrip(db: DrizzleSqliteDb, tripId: string) {
  const rows = await db
    .select({ name: schema.tags.name })
    .from(schema.tripTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.tripTags.tagId))
    .where(eq(schema.tripTags.tripId, tripId));
  return rows.map((r) => r.name);
}

async function persistPhotos(
  db: DrizzleSqliteDb,
  tripId: string,
  uriList: readonly string[],
) {
  await db.delete(schema.tripPhotos).where(eq(schema.tripPhotos.tripId, tripId));

  const root = FileSystem.documentDirectory ?? "";
  const base = `${root}trips/${tripId}/`;
  await FileSystem.makeDirectoryAsync(base, { intermediates: true });

  let order = 0;
  for (const uri of uriList) {
    const id = crypto.randomUUID();
    const dest = `${base}${id}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    await db.insert(schema.tripPhotos).values({
      id,
      tripId,
      localUri: dest,
      sortOrder: order++,
      uploadStatus: "local_only",
      createdAt: nowIso(),
    });
  }
}

export async function createTripRecord(
  db: DrizzleSqliteDb,
  input: TripInput,
  photoUris: readonly string[],
) {
  const id = input.id ?? crypto.randomUUID();
  const iso = nowIso();

  await db.transaction(async (tx) => {
    await tx.insert(schema.trips).values({
      id,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      placeName: input.placeName ?? null,
      notes: input.notes,
      rating: input.rating,
      isFavourite: input.isFavourite,
      syncStatus: "pending_push",
      serverId: null,
      deletedAt: null,
      createdAt: iso,
      updatedAt: iso,
    });
    await linkTripTags(tx as DrizzleSqliteDb, id, input.tagNames);
  });

  if (photoUris.length) await persistPhotos(db, id, photoUris);

  const payload = {
    id,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    latitude: input.latitude,
    longitude: input.longitude,
    placeName: input.placeName,
    notes: input.notes,
    rating: input.rating,
    isFavourite: input.isFavourite,
    tagNames: input.tagNames,
  };

  await enqueueOutbox(db, "trip_upsert", id, payload);
  return id;
}

export async function updateTripRecord(
  db: DrizzleSqliteDb,
  id: string,
  patch: Partial<TripInput> & { tagNames?: string[] },
  photoUris?: readonly string[],
) {
  const existing = await getTrip(db, id);
  if (!existing) throw new Error("Trip not found");

  const merged = {
    title: patch.title !== undefined ? patch.title : existing.title,
    startDate: patch.startDate !== undefined ? patch.startDate : existing.startDate,
    endDate: patch.endDate !== undefined ? patch.endDate : existing.endDate,
    latitude: patch.latitude !== undefined ? patch.latitude : existing.latitude,
    longitude:
      patch.longitude !== undefined ? patch.longitude : existing.longitude,
    placeName: patch.placeName !== undefined ? patch.placeName : existing.placeName,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    rating: patch.rating !== undefined ? patch.rating : existing.rating,
    isFavourite:
      patch.isFavourite !== undefined ? patch.isFavourite : existing.isFavourite,
  };

  await db
    .update(schema.trips)
    .set({
      ...merged,
      placeName: merged.placeName ?? null,
      latitude: merged.latitude ?? null,
      longitude: merged.longitude ?? null,
      updatedAt: nowIso(),
      syncStatus: "pending_push",
    })
    .where(eq(schema.trips.id, id));

  if (patch.tagNames) {
    await linkTripTags(db, id, patch.tagNames);
  }

  if (photoUris && photoUris.length) {
    await persistPhotos(db, id, photoUris);
  }

  const tagNames = patch.tagNames ?? (await tagNamesForTrip(db, id));

  await enqueueOutbox(db, "trip_upsert", id, {
    id,
    ...merged,
    tagNames,
  });
}

export async function toggleFavouriteTrip(db: DrizzleSqliteDb, id: string) {
  const row = await getTrip(db, id);
  if (!row) throw new Error("Trip not found");
  await updateTripRecord(db, id, { isFavourite: !row.isFavourite });
}

export async function softDeleteTrip(db: DrizzleSqliteDb, id: string) {
  await db
    .update(schema.trips)
    .set({
      deletedAt: nowIso(),
      updatedAt: nowIso(),
      syncStatus: "pending_push",
    })
    .where(eq(schema.trips.id, id));

  await enqueueOutbox(db, "trip_delete", id, { id });
}

export async function listTripPhotos(db: DrizzleSqliteDb, tripId: string) {
  return db
    .select()
    .from(schema.tripPhotos)
    .where(eq(schema.tripPhotos.tripId, tripId))
    .orderBy(asc(schema.tripPhotos.sortOrder));
}

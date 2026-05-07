import { tags as tagsTable, tripTags as tripTagsTable, trips } from "@camp-log/db/schema";
import type { TripInput } from "@camp-log/contracts";
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { DrizzleDb, DrizzleTxn } from "@camp-log/db";
import { randomUUID } from "node:crypto";

export type TripEntity = InferSelectModel<typeof trips>;

export type TripUpsertPayload = Omit<
  TripInput,
  "id" | "tagNames"
>;

/** Lowercase trimmed key for uniqueness per user */
export function normalizedTag(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

type DrizzleExec = DrizzleDb | DrizzleTxn;

async function getOrCreateTag(dr: DrizzleExec, userId: string, displayName: string) {
  const normalized = normalizedTag(displayName);

  const [existing] = await dr
    .select()
    .from(tagsTable)
    .where(
      and(eq(tagsTable.userId, userId), eq(tagsTable.normalizedName, normalized)),
    )
    .limit(1);

  if (existing) return existing;

  const id = randomUUID();
  const [created] = await dr
    .insert(tagsTable)
    .values({
      id,
      userId,
      name: displayName.trim(),
      normalizedName: normalized,
      createdAt: new Date(),
    })
    .returning();

  return created!;
}

/** Replace trip tag links with provided names (deduped); run inside caller transaction when needed */
export async function linkTripTags(
  dr: DrizzleExec,
  userId: string,
  tripId: string,
  tagNames: readonly string[],
) {
  await dr.delete(tripTagsTable).where(eq(tripTagsTable.tripId, tripId));

  const seen = new Set<string>();

  for (const raw of tagNames) {
    const trimmed = raw.trim();
    const key = normalizedTag(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const tagRow = await getOrCreateTag(dr, userId, trimmed);
    await dr.insert(tripTagsTable).values({
      tripId,
      tagId: tagRow.id,
      createdAt: new Date(),
    });
  }
}

export function serializeTrip(row: TripEntity, tags: readonly string[]) {
  return {
    id: row.id,
    title: row.title,
    startDate: row.startDate as string,
    endDate: row.endDate as string,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    placeName: row.placeName ?? null,
    notes: row.notes,
    rating: row.rating,
    isFavourite: row.isFavourite,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: [...tags],
  };
}

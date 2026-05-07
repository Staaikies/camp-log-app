import * as schema from "@/db/schema";

import type { DrizzleSqliteDb } from "@/lib/trip-types";

import { eq } from "drizzle-orm";

export function normalizedTag(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Replace junction rows and upsert tags by normalized name.d */
export async function linkTripTags(
  db: DrizzleSqliteDb,
  tripId: string,
  tagNames: readonly string[],
) {
  await db.delete(schema.tripTags).where(eq(schema.tripTags.tripId, tripId));

  const seen = new Set<string>();

  for (const raw of tagNames) {
    const trimmed = raw.trim();
    const key = normalizedTag(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const [existing] = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.normalizedName, key))
      .limit(1);

    const tagId = existing?.id ?? crypto.randomUUID();

    if (!existing) {
      await db.insert(schema.tags).values({
        id: tagId,
        name: trimmed,
        normalizedName: key,
        createdAt: new Date().toISOString(),
      });
    }

    await db.insert(schema.tripTags).values({
      tripId,
      tagId,
      createdAt: new Date().toISOString(),
    });
  }
}

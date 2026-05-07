import { tripInputSchema } from "@camp-log/contracts";
import {
  trips,
  tags as tagsTable,
  tripTags as tripTagsTable,
} from "@camp-log/db/schema";
import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db.js";

import {
  linkTripTags,
  serializeTrip,
  type TripEntity,
} from "../lib/trips-helpers.js";

async function tagNamesForTripIds(ids: readonly string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;

  const rows = await db
    .select({
      tripId: tripTagsTable.tripId,
      name: tagsTable.name,
    })
    .from(tripTagsTable)
    .innerJoin(tagsTable, eq(tagsTable.id, tripTagsTable.tagId))
    .where(inArray(tripTagsTable.tripId, [...ids]));

  for (const row of rows) {
    const bucket = map.get(row.tripId) ?? [];
    bucket.push(row.name);
    map.set(row.tripId, bucket);
  }
  return map;
}

export const tripsRoutes = new Hono<{
  Variables: { userId: string | null };
}>();

tripsRoutes.use("*", async (c, next) => {
  if (!c.get("userId")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

tripsRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const favouritesOnly =
    c.req.query("favouritesOnly") === "1" ||
    c.req.query("favouritesOnly") === "true";

  const rows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        isNull(trips.deletedAt),
        ...(favouritesOnly ? [eq(trips.isFavourite, true)] : []),
      ),
    )
    .orderBy(desc(trips.startDate));

  const tagsByTrip = await tagNamesForTripIds(rows.map((r) => r.id));
  return c.json(
    rows.map((row) => serializeTrip(row, tagsByTrip.get(row.id) ?? [])),
  );
});

tripsRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const [row] = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.id, id),
        eq(trips.userId, userId),
        isNull(trips.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return c.json({ error: "Not found" }, 404);

  const tagsByTrip = await tagNamesForTripIds([row.id]);
  return c.json(serializeTrip(row, tagsByTrip.get(row.id) ?? []));
});

tripsRoutes.post("/", async (c) => {
  const userId = c.get("userId")!;
  const parsed = tripInputSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const input = parsed.data;
  const id = input.id ?? randomUUID();

  await db.transaction(async (tx) => {
    const ins: typeof trips.$inferInsert = {
      id,
      userId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      placeName: input.placeName ?? null,
      notes: input.notes,
      rating: input.rating,
      isFavourite: input.isFavourite,
      deletedAt: null,
    };
    await tx.insert(trips).values(ins);
    await linkTripTags(tx, userId, id, input.tagNames);
  });

  const [created] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  const tagsByTrip = await tagNamesForTripIds([id]);
  return c.json(serializeTrip(created!, tagsByTrip.get(id) ?? []), 201);
});

tripsRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const parsed = tripInputSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.id, id),
        eq(trips.userId, userId),
        isNull(trips.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.transaction(async (tx) => {
    await tx
      .update(trips)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.placeName !== undefined ? { placeName: input.placeName } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.isFavourite !== undefined ? { isFavourite: input.isFavourite } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)));

    if (input.tagNames !== undefined) {
      await linkTripTags(tx, userId, id, input.tagNames);
    }
  });

  const [row] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  const tagsByTrip = await tagNamesForTripIds([id]);
  return c.json(
    serializeTrip(row as TripEntity, tagsByTrip.get(id) ?? []),
  );
});

tripsRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  await db.transaction(async (tx) => {
    await tx.delete(tripTagsTable).where(eq(tripTagsTable.tripId, id));
    await tx
      .update(trips)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(trips.id, id),
          eq(trips.userId, userId),
          isNull(trips.deletedAt),
        ),
      );
  });

  return c.body(null, 204);
});

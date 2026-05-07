import { z } from "zod";

/** Client-generated id (UUID); canonical across offline + sync */
export const idSchema = z.string().uuid();

export const syncStatusSchema = z.enum([
  "synced",
  "pending_push",
  "push_error",
]);

export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const tripInputSchema = z.object({
  id: idSchema.optional(),
  title: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  placeName: z.string().max(500).nullable().optional(),
  notes: z.string().max(20_000).default(""),
  rating: z.number().int().min(1).max(5),
  isFavourite: z.boolean().default(false),
  tagNames: z.array(z.string().min(1).max(64)).default([]),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const tripRowSchema = tripInputSchema.extend({
  id: idSchema,
  serverId: idSchema.nullable().optional(),
  syncStatus: syncStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type TripRow = z.infer<typeof tripRowSchema>;

export const outboxMutationSchema = z.enum([
  "trip_upsert",
  "trip_delete",
  "tag_attach",
]);

export type OutboxMutation = z.infer<typeof outboxMutationSchema>;

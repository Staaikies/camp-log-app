import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    placeName: text("place_name"),
    notes: text("notes").notNull().default(""),
    rating: smallint("rating").notNull(),
    isFavourite: boolean("is_favourite").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("trips_user_favourite_start_idx").on(
      t.userId,
      t.isFavourite,
      t.startDate,
    ),
    index("trips_user_start_idx").on(t.userId, t.startDate),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tags_user_normalized_unique").on(
      t.userId,
      t.normalizedName,
    ),
  ],
);

export const tripTags = pgTable(
  "trip_tags",
  {
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tripId, t.tagId], name: "trip_tags_pkey" }),
  ],
);

export const tripPhotos = pgTable(
  "trip_photos",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storageKey: text("storage_key"),
    remoteUrl: text("remote_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("trip_photos_trip_sort_idx").on(t.tripId, t.sortOrder)],
);

export const tripRelations = relations(trips, ({ one, many }) => ({
  user: one(user, { fields: [trips.userId], references: [user.id] }),
  tripTags: many(tripTags),
  photos: many(tripPhotos),
}));

export const tagRelations = relations(tags, ({ one, many }) => ({
  user: one(user, { fields: [tags.userId], references: [user.id] }),
  tripTags: many(tripTags),
}));

export const tripTagRelations = relations(tripTags, ({ one }) => ({
  trip: one(trips, { fields: [tripTags.tripId], references: [trips.id] }),
  tag: one(tags, { fields: [tripTags.tagId], references: [tags.id] }),
}));

export const tripPhotoRelations = relations(tripPhotos, ({ one }) => ({
  trip: one(trips, { fields: [tripPhotos.tripId], references: [trips.id] }),
  user: one(user, { fields: [tripPhotos.userId], references: [user.id] }),
}));

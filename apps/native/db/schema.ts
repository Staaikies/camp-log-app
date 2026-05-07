import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  placeName: text("place_name"),
  notes: text("notes").notNull().default(""),
  rating: integer("rating").notNull(),
  isFavourite: integer("is_favourite", { mode: "boolean" }).notNull().default(false),
  syncStatus: text("sync_status").notNull().default("pending_push"),
  serverId: text("server_id"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const tripTags = sqliteTable(
  "trip_tags",
  {
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tripId, t.tagId] }),
  }),
);

export const tripPhotos = sqliteTable("trip_photos", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  localUri: text("local_uri").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadStatus: text("upload_status").notNull().default("local_only"),
  createdAt: text("created_at").notNull(),
});

export const outbox = sqliteTable("outbox", {
  id: text("id").primaryKey(),
  mutation: text("mutation").notNull(),
  entityId: text("entity_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});

import * as schema from "@/db/schema";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

export type DrizzleSqliteDb = ExpoSQLiteDatabase<typeof schema>;

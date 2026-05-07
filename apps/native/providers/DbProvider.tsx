import * as schema from "@/db/schema";

import migrations from "@/drizzle/migrations";
import type { DrizzleSqliteDb } from "@/lib/trip-types";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

import { ActivityIndicator, Text, View } from "react-native";

import { useSQLiteContext } from "expo-sqlite";

const DbCtx = createContext<DrizzleSqliteDb | null>(null);

export function DbGate({ children }: { children: React.ReactNode }) {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => drizzle(sqlite, { schema }), [sqlite]);
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text>Database migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <DbCtx.Provider value={db}>{children}</DbCtx.Provider>;
}

export function useDb(): DrizzleSqliteDb {
  const db = useContext(DbCtx);
  if (!db) throw new Error("useDb must be used within DbGate inside SQLiteProvider");
  return db;
}

import * as schema from "@/db/schema";
import type { OutboxMutation } from "@camp-log/contracts";
import type { DrizzleSqliteDb } from "@/lib/trip-types";

/** Queue a change for eventual server sync.drain stub can read this later. */
export async function enqueueOutbox(
  db: DrizzleSqliteDb,
  mutation: OutboxMutation,
  entityId: string,
  payload: unknown,
) {
  await db.insert(schema.outbox).values({
    id: crypto.randomUUID(),
    mutation,
    entityId,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  });
}

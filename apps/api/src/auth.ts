import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@camp-log/db/schema";
import { betterAuth } from "better-auth";
import { db } from "./db.js";

const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((s) =>
  s.trim(),
) ?? ["http://localhost:5173"];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-change-me-in-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
});

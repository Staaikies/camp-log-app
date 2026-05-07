import { serve } from "@hono/node-server";
import "dotenv/config";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { auth } from "./auth.js";
import { tripsRoutes } from "./routes/trips.js";

const corsOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((s) =>
  s.trim(),
) ?? ["http://localhost:5173"];

const port = Number(process.env.PORT ?? 8787);

const app = new Hono<{
  Variables: {
    userId: string | null;
  };
}>();

app.use("*", cors({
  origin: corsOrigins,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposeHeaders: ["Content-Length", "Set-Cookie"],
  maxAge: 600,
  credentials: true,
}));

app.on(["POST", "GET", "OPTIONS"], "/api/auth/*", (c) =>
  auth.handler(c.req.raw),
);

app.use("*", async (c, next) => {
  const sessionWrap = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set(
    "userId",
    sessionWrap?.session?.userId ?? sessionWrap?.user?.id ?? null,
  );
  await next();
});

app.get("/api/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ authenticated: false }, 401);
  }
  return c.json({ authenticated: true, user: session.user });
});

app.route("/api/trips", tripsRoutes);

app.get("/", (c) =>
  c.json({ ok: true, service: "camp-log-api", version: "0.0.1" }),
);

console.log(`Listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

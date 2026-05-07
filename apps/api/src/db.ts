import "dotenv/config";
import { createDb } from "@camp-log/db";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required for the API");
}

export const db = createDb(url);

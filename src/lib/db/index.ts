import "server-only";
import fs from "fs";
import path from "path";
import { createAppDatabase, ensureQueueShape, seedDemoIfEmpty } from "./repository";
import type { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as { fairturnDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.fairturnDb) {
    const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "fairturn.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = createAppDatabase(file);
    if (process.env.SEED_DEMO === "true") seedDemoIfEmpty(db);
    globalForDb.fairturnDb = db;
  }
  ensureQueueShape(globalForDb.fairturnDb);
  return globalForDb.fairturnDb;
}

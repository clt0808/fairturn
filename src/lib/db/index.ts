import "server-only";
import { env } from "cloudflare:workers";
import { ensureQueueShape, seedDemoIfEmpty, type AppDatabase } from "./repository";

type WorkerEnv = {
  DB?: AppDatabase;
  SEED_DEMO?: string;
};

let demoSeeded = false;

export async function getDb(): Promise<AppDatabase> {
  const workerEnv = env as WorkerEnv;
  const database = workerEnv.DB;
  if (!database) {
    throw new Error("D1 binding DB is not configured");
  }
  await ensureQueueShape(database);
  const seed = workerEnv.SEED_DEMO ?? process.env.SEED_DEMO;
  if (!demoSeeded && seed === "true") {
    await seedDemoIfEmpty(database);
    demoSeeded = true;
  }
  return database;
}

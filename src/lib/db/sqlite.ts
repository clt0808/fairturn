import { DatabaseSync } from "node:sqlite";
import { ensureQueueShape } from "./repository";
import type { AppDatabase, PreparedQuery, SqlBind } from "./types";

class SqliteStatement implements PreparedQuery {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly params: SqlBind[] = [],
  ) {}

  bind(...values: SqlBind[]): PreparedQuery {
    return new SqliteStatement(this.database, this.sql, values);
  }

  async all<T extends Record<string, unknown>>() {
    const results = this.database.prepare(this.sql).all(...(this.params as [])) as T[];
    return { results };
  }

  async first<T extends Record<string, unknown>>() {
    const row = this.database.prepare(this.sql).get(...(this.params as [])) as T | undefined;
    return row ?? null;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...(this.params as []));
    return { meta: { changes: Number(result.changes) } };
  }
}

class SqliteAppDatabase implements AppDatabase {
  constructor(private readonly database: DatabaseSync) {}

  prepare(sql: string): PreparedQuery {
    return new SqliteStatement(this.database, sql);
  }

  async exec(sql: string) {
    this.database.exec(sql);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.database.exec("ROLLBACK");
      } catch {
        /* already closed */
      }
      throw error;
    }
  }
}

/** In-memory SQLite with the same async calls the Worker makes against D1. */
export async function createAppDatabase(): Promise<AppDatabase> {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  const db = new SqliteAppDatabase(database);
  await ensureQueueShape(db);
  return db;
}

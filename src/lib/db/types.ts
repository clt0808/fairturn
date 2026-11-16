export type SqlBind = string | number | bigint | null | Uint8Array | ArrayBuffer;

export interface PreparedQuery {
  bind(...values: SqlBind[]): PreparedQuery;
  all<T extends Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T extends Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}

/** Async SQL surface shared by D1 and the local SQLite shim used in tests. */
export interface AppDatabase {
  prepare(sql: string): PreparedQuery;
  exec(sql: string): Promise<unknown>;
  transaction?<T>(fn: () => Promise<T>): Promise<T>;
}

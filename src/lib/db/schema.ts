/** Tables and indexes that do not depend on a later ALTER. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  scheme_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  url TEXT NOT NULL,
  weight INTEGER NOT NULL,
  current_weight INTEGER NOT NULL,
  handouts INTEGER NOT NULL DEFAULT 0,
  boosted INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  is_owner INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS links_active_email
  ON links(scheme_id, email) WHERE active = 1;

CREATE UNIQUE INDEX IF NOT EXISTS links_active_code
  ON links(scheme_id, code) WHERE active = 1;

CREATE TABLE IF NOT EXISTS claim_tokens (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  scheme_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  handed_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  consumed_by_link_id TEXT,
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS handouts (
  id TEXT PRIMARY KEY,
  scheme_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  token_id TEXT,
  created_at INTEGER NOT NULL,
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS rate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_events_lookup
  ON rate_events(action, ip_hash, created_at);

CREATE TABLE IF NOT EXISTS queue_settings (
  scheme_id TEXT PRIMARY KEY,
  owner_every INTEGER NOT NULL
);
`;

export const OWNER_INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS links_one_owner
  ON links(scheme_id) WHERE is_owner = 1;
`;

/** Plain SQL applied to an empty D1 database. Idempotent. */
export const MIGRATION_SQL = `${SCHEMA_SQL.trim()}\n\n${OWNER_INDEX_SQL.trim()}\n`;

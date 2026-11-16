import { DatabaseSync } from "node:sqlite";
import {
  BOOST_RULES,
  CLAIM_TTL_MS,
  exceedsLimit,
  HANDOUT_RULES,
  RATE_RETENTION_MS,
  SUBMIT_RULES,
  type LimitRule,
} from "@/lib/abuse/limits";
import { generateClaimCode } from "@/lib/claims/code";
import { evaluateClaim, type ClaimRejectReason } from "@/lib/claims/evaluate";
import { BOOSTED_WEIGHT, moveInQueue, pickNext, STANDARD_WEIGHT, type QueueMember } from "@/lib/queue";
import { edfScheme } from "@/lib/schemes/edf";

export type LinkRow = {
  id: string;
  schemeId: string;
  email: string;
  code: string;
  url: string;
  weight: number;
  currentWeight: number;
  handouts: number;
  boosted: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

type LinkSql = {
  id: string;
  scheme_id: string;
  email: string;
  code: string;
  url: string;
  weight: number;
  current_weight: number;
  handouts: number;
  boosted: number;
  active: number;
  created_at: number;
  updated_at: number;
};

type TokenSql = {
  id: string;
  code: string;
  scheme_id: string;
  link_id: string;
  handed_code: string;
  created_at: number;
  expires_at: number;
  consumed_at: number | null;
  consumed_by_link_id: string | null;
  ip_hash: string | null;
};

export type SubmitReason =
  | "rate"
  | "email-taken"
  | "code-taken"
  | "boost-cap"
  | `claim-${ClaimRejectReason}`;

export type SubmitResult =
  | { ok: true; boosted: boolean; id: string }
  | { ok: false; reason: SubmitReason };

export type HandoutResult =
  | {
      ok: true;
      url: string;
      code: string;
      claimCode: string;
      linkId: string;
      demo: boolean;
    }
  | { ok: false; reason: "empty" | "rate" };

export type ActiveResult = { ok: true } | { ok: false; reason: "missing" | "email-taken" | "code-taken" };

function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already closed */
    }
    throw error;
  }
}

function mapLink(row: LinkSql): LinkRow {
  return {
    id: row.id,
    schemeId: row.scheme_id,
    email: row.email,
    code: row.code,
    url: row.url,
    weight: row.weight,
    currentWeight: row.current_weight,
    handouts: row.handouts,
    boosted: row.boosted === 1,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMember(link: LinkRow): QueueMember {
  return {
    id: link.id,
    weight: link.weight,
    currentWeight: link.currentWeight,
    handouts: link.handouts,
    createdAt: link.createdAt,
    active: link.active,
  };
}

export function createAppDatabase(filename = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 3000;

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
  `);
  return db;
}

function pruneRates(db: DatabaseSync, now: number) {
  db.prepare("DELETE FROM rate_events WHERE created_at < ?").run(now - RATE_RETENTION_MS);
}

function recentStamps(db: DatabaseSync, action: string, ipHash: string, since: number): number[] {
  const rows = db
    .prepare(
      "SELECT created_at FROM rate_events WHERE action = ? AND ip_hash = ? AND created_at > ? ORDER BY created_at",
    )
    .all(action, ipHash, since) as { created_at: number }[];
  return rows.map((row) => row.created_at);
}

function noteRate(db: DatabaseSync, action: string, ipHash: string, now: number) {
  db.prepare("INSERT INTO rate_events (action, ip_hash, created_at) VALUES (?, ?, ?)").run(action, ipHash, now);
}

export function isRateLimited(
  db: DatabaseSync,
  action: string,
  ipHash: string,
  now: number,
  rules: readonly LimitRule[],
): boolean {
  const longest = Math.max(...rules.map((rule) => rule.windowMs));
  return exceedsLimit(recentStamps(db, action, ipHash, now - longest), now, rules);
}

export function noteRateEvent(db: DatabaseSync, action: string, ipHash: string, now = Date.now()) {
  noteRate(db, action, ipHash, now);
}

export function listLinks(db: DatabaseSync, schemeId: string): LinkRow[] {
  const rows = db
    .prepare("SELECT * FROM links WHERE scheme_id = ? ORDER BY created_at ASC, id ASC")
    .all(schemeId) as LinkSql[];
  return rows.map(mapLink);
}

function activeTaken(db: DatabaseSync, schemeId: string, column: "email" | "code", value: string): boolean {
  const row = db
    .prepare(`SELECT id FROM links WHERE scheme_id = ? AND ${column} = ? AND active = 1`)
    .get(schemeId, value) as { id: string } | undefined;
  return Boolean(row);
}

export function submitLink(
  db: DatabaseSync,
  input: {
    schemeId: string;
    email: string;
    code: string;
    url: string;
    claimCode: string | null;
    ipHash: string;
    now?: number;
  },
): SubmitResult {
  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  return withTransaction(db, () => {
    pruneRates(db, now);
    if (isRateLimited(db, "submit", input.ipHash, now, SUBMIT_RULES)) {
      return { ok: false, reason: "rate" };
    }

    let boosted = false;
    let tokenId: string | null = null;

    if (input.claimCode) {
      const token = db.prepare("SELECT * FROM claim_tokens WHERE code = ?").get(input.claimCode) as
        | TokenSql
        | undefined;
      const decision = evaluateClaim({
        rawCode: input.claimCode,
        token: token
          ? {
              id: token.id,
              code: token.code,
              handedCode: token.handed_code,
              expiresAt: token.expires_at,
              consumedAt: token.consumed_at,
            }
          : null,
        submittedReferralCode: input.code,
        alreadyBoosted: false,
        now,
      });

      if (decision.outcome === "reject") {
        noteRate(db, "submit", input.ipHash, now);
        return { ok: false, reason: `claim-${decision.reason}` };
      }

      if (decision.outcome === "accept") {
        if (isRateLimited(db, "boost", input.ipHash, now, BOOST_RULES)) {
          noteRate(db, "submit", input.ipHash, now);
          return { ok: false, reason: "boost-cap" };
        }
        boosted = true;
        tokenId = decision.tokenId;
      }
    }

    if (activeTaken(db, input.schemeId, "email", email)) {
      noteRate(db, "submit", input.ipHash, now);
      return { ok: false, reason: "email-taken" };
    }
    if (activeTaken(db, input.schemeId, "code", input.code)) {
      noteRate(db, "submit", input.ipHash, now);
      return { ok: false, reason: "code-taken" };
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO links (
        id, scheme_id, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`,
    ).run(
      id,
      input.schemeId,
      email,
      input.code,
      input.url,
      boosted ? BOOSTED_WEIGHT : STANDARD_WEIGHT,
      boosted ? 1 : 0,
      now,
      now,
    );

    if (boosted && tokenId) {
      const consumed = db
        .prepare(
          "UPDATE claim_tokens SET consumed_at = ?, consumed_by_link_id = ? WHERE id = ? AND consumed_at IS NULL",
        )
        .run(now, id, tokenId);
      if (consumed.changes !== 1) {
        throw new Error("Claim token could not be consumed");
      }
      noteRate(db, "boost", input.ipHash, now);
    }

    noteRate(db, "submit", input.ipHash, now);
    return { ok: true, boosted, id };
  });
}

export function adminInsertLink(
  db: DatabaseSync,
  input: {
    schemeId: string;
    email: string;
    code: string;
    url: string;
    boosted: boolean;
    now?: number;
  },
): SubmitResult {
  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  return withTransaction(db, () => {
    if (activeTaken(db, input.schemeId, "email", email)) {
      return { ok: false, reason: "email-taken" };
    }
    if (activeTaken(db, input.schemeId, "code", input.code)) {
      return { ok: false, reason: "code-taken" };
    }
    const id = crypto.randomUUID();
    const weight = input.boosted ? BOOSTED_WEIGHT : STANDARD_WEIGHT;
    db.prepare(
      `INSERT INTO links (
        id, scheme_id, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`,
    ).run(id, input.schemeId, email, input.code, input.url, weight, input.boosted ? 1 : 0, now, now);
    return { ok: true, boosted: input.boosted, id };
  });
}

export function handOutLink(
  db: DatabaseSync,
  input: { schemeId: string; ipHash: string; now?: number; newClaimCode?: () => string },
): HandoutResult {
  const now = input.now ?? Date.now();
  const newClaimCode = input.newClaimCode ?? generateClaimCode;

  return withTransaction(db, () => {
    pruneRates(db, now);
    if (isRateLimited(db, "handout", input.ipHash, now, HANDOUT_RULES)) {
      return { ok: false, reason: "rate" };
    }

    const links = listLinks(db, input.schemeId).filter((link) => link.active);
    const picked = pickNext(links.map(toMember));
    if (!picked) return { ok: false, reason: "empty" };

    const update = db.prepare(
      "UPDATE links SET current_weight = ?, handouts = ?, updated_at = ? WHERE id = ?",
    );
    for (const member of picked.members) {
      update.run(member.currentWeight, member.handouts, now, member.id);
    }

    const link = links.find((item) => item.id === picked.pickedId);
    if (!link) throw new Error("Picked link disappeared");

    const claimCode = newClaimCode();
    const tokenId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO claim_tokens (
        id, code, scheme_id, link_id, handed_code, created_at, expires_at, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      tokenId,
      claimCode,
      input.schemeId,
      link.id,
      link.code,
      now,
      now + CLAIM_TTL_MS,
      input.ipHash,
    );

    db.prepare(
      "INSERT INTO handouts (id, scheme_id, link_id, token_id, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(crypto.randomUUID(), input.schemeId, link.id, tokenId, now, input.ipHash);

    noteRate(db, "handout", input.ipHash, now);

    return {
      ok: true,
      url: link.url,
      code: link.code,
      claimCode,
      linkId: link.id,
      demo: link.email.endsWith("@example.com"),
    };
  });
}

export function setLinkActive(db: DatabaseSync, id: string, active: boolean, now = Date.now()): ActiveResult {
  return withTransaction(db, () => {
    const row = db.prepare("SELECT * FROM links WHERE id = ?").get(id) as LinkSql | undefined;
    if (!row) return { ok: false, reason: "missing" };
    if (active) {
      if (activeTaken(db, row.scheme_id, "email", row.email)) return { ok: false, reason: "email-taken" };
      if (activeTaken(db, row.scheme_id, "code", row.code)) return { ok: false, reason: "code-taken" };
    }
    db.prepare("UPDATE links SET active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, now, id);
    return { ok: true };
  });
}

export function reorderLink(
  db: DatabaseSync,
  schemeId: string,
  id: string,
  direction: "up" | "down",
  now = Date.now(),
) {
  withTransaction(db, () => {
    const links = listLinks(db, schemeId);
    const updated = moveInQueue(links.map(toMember), id, direction);
    const write = db.prepare("UPDATE links SET current_weight = ?, updated_at = ? WHERE id = ?");
    for (const member of updated) {
      if (!member.active) continue;
      write.run(member.currentWeight, now, member.id);
    }
  });
}

export type TicketView = {
  claimCode: string;
  url: string;
  referralCode: string;
  consumed: boolean;
  expired: boolean;
  demo: boolean;
};

export function lookupTicket(db: DatabaseSync, claimCode: string, now = Date.now()): TicketView | null {
  const row = db
    .prepare(
      `SELECT t.code, t.expires_at, t.consumed_at, l.url, l.code AS referral_code, l.email
       FROM claim_tokens t
       JOIN links l ON l.id = t.link_id
       WHERE t.code = ?`,
    )
    .get(claimCode) as
    | {
        code: string;
        expires_at: number;
        consumed_at: number | null;
        url: string;
        referral_code: string;
        email: string;
      }
    | undefined;

  if (!row) return null;
  return {
    claimCode: row.code,
    url: row.url,
    referralCode: row.referral_code,
    consumed: row.consumed_at !== null,
    expired: row.expires_at <= now,
    demo: row.email.endsWith("@example.com"),
  };
}

const DEMO_LINKS: { email: string; code: string; boosted: boolean }[] = [
  { email: "priya@example.com", code: "amber-lark-2401", boosted: false },
  { email: "sam@example.com", code: "quiet-brook-1184", boosted: false },
  { email: "jordan@example.com", code: "copper-fern-9033", boosted: true },
  { email: "r.okonkwo@example.com", code: "mild-harbor-5520", boosted: false },
];

/** Sample queue for local screenshots. Not real EDF customers. */
export function seedDemoIfEmpty(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM links").get() as { n: number };
  if (count.n > 0) return;
  const base = Date.parse("2026-11-16T09:00:00Z");
  DEMO_LINKS.forEach((link, index) => {
    adminInsertLink(db, {
      schemeId: edfScheme.id,
      email: link.email,
      code: link.code,
      url: `https://www.edfenergy.com/quote/refer-a-friend/${link.code}`,
      boosted: link.boosted,
      now: base + index * 1000,
    });
  });
}

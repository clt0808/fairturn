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
import {
  BOOSTED_WEIGHT,
  handOutNext,
  moveInQueue,
  parseOwnerEvery,
  STANDARD_WEIGHT,
  type QueueMember,
} from "@/lib/queue";
import { edfScheme } from "@/lib/schemes/edf";
import { OWNER_INDEX_SQL, SCHEMA_SQL } from "./schema";
import type { AppDatabase } from "./types";

export type { AppDatabase } from "./types";

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
  owner: boolean;
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
  is_owner: number;
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

async function withTransaction<T>(db: AppDatabase, fn: () => Promise<T>): Promise<T> {
  if (db.transaction) return db.transaction(fn);
  // D1 has no interactive BEGIN/COMMIT. Statements run in this same order.
  return fn();
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
    owner: row.is_owner === 1,
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
    owner: link.owner,
  };
}

/** D1's local exec treats a newline as the end of a statement, so each command is one line. */
function sqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => statement.length > 0);
}

async function execSql(db: AppDatabase, sql: string) {
  for (const statement of sqlStatements(sql)) {
    await db.exec(`${statement};`);
  }
}

/** Safe to run on every request. Adds the owner-link column to a database created before it. */
export async function ensureQueueShape(db: AppDatabase) {
  await execSql(db, SCHEMA_SQL);
  const info = await db.prepare("PRAGMA table_info(links)").all<{ name: string }>();
  if (!info.results.some((column) => column.name === "is_owner")) {
    await db.exec("ALTER TABLE links ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0");
  }
  await execSql(db, OWNER_INDEX_SQL);
}

async function pruneRates(db: AppDatabase, now: number) {
  await db.prepare("DELETE FROM rate_events WHERE created_at < ?").bind(now - RATE_RETENTION_MS).run();
}

async function recentStamps(db: AppDatabase, action: string, ipHash: string, since: number): Promise<number[]> {
  const rows = await db
    .prepare(
      "SELECT created_at FROM rate_events WHERE action = ? AND ip_hash = ? AND created_at > ? ORDER BY created_at",
    )
    .bind(action, ipHash, since)
    .all<{ created_at: number }>();
  return rows.results.map((row) => row.created_at);
}

async function noteRate(db: AppDatabase, action: string, ipHash: string, now: number) {
  await db
    .prepare("INSERT INTO rate_events (action, ip_hash, created_at) VALUES (?, ?, ?)")
    .bind(action, ipHash, now)
    .run();
}

export async function isRateLimited(
  db: AppDatabase,
  action: string,
  ipHash: string,
  now: number,
  rules: readonly LimitRule[],
): Promise<boolean> {
  const longest = Math.max(...rules.map((rule) => rule.windowMs));
  return exceedsLimit(await recentStamps(db, action, ipHash, now - longest), now, rules);
}

export async function noteRateEvent(db: AppDatabase, action: string, ipHash: string, now = Date.now()) {
  await noteRate(db, action, ipHash, now);
}

export async function listLinks(db: AppDatabase, schemeId: string): Promise<LinkRow[]> {
  const rows = await db
    .prepare("SELECT * FROM links WHERE scheme_id = ? ORDER BY created_at ASC, id ASC")
    .bind(schemeId)
    .all<LinkSql>();
  return rows.results.map(mapLink);
}

async function activeTaken(db: AppDatabase, schemeId: string, column: "email" | "code", value: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT id FROM links WHERE scheme_id = ? AND ${column} = ? AND active = 1`)
    .bind(schemeId, value)
    .first<{ id: string }>();
  return Boolean(row);
}

export async function submitLink(
  db: AppDatabase,
  input: {
    schemeId: string;
    email: string;
    code: string;
    url: string;
    claimCode: string | null;
    ipHash: string;
    now?: number;
  },
): Promise<SubmitResult> {
  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  return withTransaction(db, async () => {
    await pruneRates(db, now);
    if (await isRateLimited(db, "submit", input.ipHash, now, SUBMIT_RULES)) {
      return { ok: false, reason: "rate" };
    }

    let boosted = false;
    let tokenId: string | null = null;

    if (input.claimCode) {
      const token = await db.prepare("SELECT * FROM claim_tokens WHERE code = ?").bind(input.claimCode).first<TokenSql>();
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
        await noteRate(db, "submit", input.ipHash, now);
        return { ok: false, reason: `claim-${decision.reason}` };
      }

      if (decision.outcome === "accept") {
        if (await isRateLimited(db, "boost", input.ipHash, now, BOOST_RULES)) {
          await noteRate(db, "submit", input.ipHash, now);
          return { ok: false, reason: "boost-cap" };
        }
        boosted = true;
        tokenId = decision.tokenId;
      }
    }

    if (await activeTaken(db, input.schemeId, "email", email)) {
      await noteRate(db, "submit", input.ipHash, now);
      return { ok: false, reason: "email-taken" };
    }
    if (await activeTaken(db, input.schemeId, "code", input.code)) {
      await noteRate(db, "submit", input.ipHash, now);
      return { ok: false, reason: "code-taken" };
    }

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO links (
        id, scheme_id, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`,
      )
      .bind(
        id,
        input.schemeId,
        email,
        input.code,
        input.url,
        boosted ? BOOSTED_WEIGHT : STANDARD_WEIGHT,
        boosted ? 1 : 0,
        now,
        now,
      )
      .run();

    if (boosted && tokenId) {
      const consumed = await db
        .prepare(
          "UPDATE claim_tokens SET consumed_at = ?, consumed_by_link_id = ? WHERE id = ? AND consumed_at IS NULL",
        )
        .bind(now, id, tokenId)
        .run();
      if (consumed.meta.changes !== 1) {
        throw new Error("Claim token could not be consumed");
      }
      await noteRate(db, "boost", input.ipHash, now);
    }

    await noteRate(db, "submit", input.ipHash, now);
    return { ok: true, boosted, id };
  });
}

export async function adminInsertLink(
  db: AppDatabase,
  input: {
    schemeId: string;
    email: string;
    code: string;
    url: string;
    boosted: boolean;
    now?: number;
  },
): Promise<SubmitResult> {
  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  return withTransaction(db, async () => {
    if (await activeTaken(db, input.schemeId, "email", email)) {
      return { ok: false, reason: "email-taken" };
    }
    if (await activeTaken(db, input.schemeId, "code", input.code)) {
      return { ok: false, reason: "code-taken" };
    }
    const id = crypto.randomUUID();
    const weight = input.boosted ? BOOSTED_WEIGHT : STANDARD_WEIGHT;
    await db
      .prepare(
        `INSERT INTO links (
        id, scheme_id, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`,
      )
      .bind(id, input.schemeId, email, input.code, input.url, weight, input.boosted ? 1 : 0, now, now)
      .run();
    return { ok: true, boosted: input.boosted, id };
  });
}

export async function handOutLink(
  db: AppDatabase,
  input: { schemeId: string; ipHash: string; now?: number; newClaimCode?: () => string },
): Promise<HandoutResult> {
  const now = input.now ?? Date.now();
  const newClaimCode = input.newClaimCode ?? generateClaimCode;

  return withTransaction(db, async () => {
    await pruneRates(db, now);
    if (await isRateLimited(db, "handout", input.ipHash, now, HANDOUT_RULES)) {
      return { ok: false, reason: "rate" };
    }

    const links = (await listLinks(db, input.schemeId)).filter((link) => link.active);
    const settings = await getQueueSettings(db, input.schemeId);
    const picked = handOutNext(links.map(toMember), {
      handoutsSoFar: await countHandouts(db, input.schemeId),
      ownerEvery: settings.ownerEvery,
    });
    if (!picked) return { ok: false, reason: "empty" };

    const update = db.prepare("UPDATE links SET current_weight = ?, handouts = ?, updated_at = ? WHERE id = ?");
    for (const member of picked.members) {
      await update.bind(member.currentWeight, member.handouts, now, member.id).run();
    }

    const link = links.find((item) => item.id === picked.pickedId);
    if (!link) throw new Error("Picked link disappeared");

    const claimCode = newClaimCode();
    const tokenId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO claim_tokens (
        id, code, scheme_id, link_id, handed_code, created_at, expires_at, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(tokenId, claimCode, input.schemeId, link.id, link.code, now, now + CLAIM_TTL_MS, input.ipHash)
      .run();

    await db
      .prepare(
        "INSERT INTO handouts (id, scheme_id, link_id, token_id, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), input.schemeId, link.id, tokenId, now, input.ipHash)
      .run();

    await noteRate(db, "handout", input.ipHash, now);

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

export async function setLinkActive(
  db: AppDatabase,
  id: string,
  active: boolean,
  now = Date.now(),
): Promise<ActiveResult> {
  return withTransaction(db, async () => {
    const row = await db.prepare("SELECT * FROM links WHERE id = ?").bind(id).first<LinkSql>();
    if (!row) return { ok: false, reason: "missing" };
    if (active) {
      if (await activeTaken(db, row.scheme_id, "email", row.email)) return { ok: false, reason: "email-taken" };
      if (await activeTaken(db, row.scheme_id, "code", row.code)) return { ok: false, reason: "code-taken" };
    }
    await db.prepare("UPDATE links SET active = ?, updated_at = ? WHERE id = ?").bind(active ? 1 : 0, now, id).run();
    return { ok: true };
  });
}

export type QueueSettings = { ownerEvery: number | null };

export async function countHandouts(db: AppDatabase, schemeId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM handouts WHERE scheme_id = ?")
    .bind(schemeId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function getQueueSettings(db: AppDatabase, schemeId: string): Promise<QueueSettings> {
  const row = await db
    .prepare("SELECT owner_every FROM queue_settings WHERE scheme_id = ?")
    .bind(schemeId)
    .first<{ owner_every: number }>();
  if (!row) return { ownerEvery: 3 };
  const parsed = parseOwnerEvery(row.owner_every);
  return { ownerEvery: parsed.ok ? parsed.ownerEvery : 3 };
}

export async function setOwnerEvery(
  db: AppDatabase,
  schemeId: string,
  value: number,
): Promise<{ ok: true; ownerEvery: number | null } | { ok: false; reason: "invalid" }> {
  const parsed = parseOwnerEvery(value);
  if (!parsed.ok) return { ok: false, reason: "invalid" };
  await db
    .prepare(
      `INSERT INTO queue_settings (scheme_id, owner_every) VALUES (?, ?)
     ON CONFLICT(scheme_id) DO UPDATE SET owner_every = excluded.owner_every`,
    )
    .bind(schemeId, parsed.ownerEvery ?? 0)
    .run();
  return { ok: true, ownerEvery: parsed.ownerEvery };
}

/** One owner link per scheme. Pass null to clear it. An inactive link may stay marked. */
export async function setOwnerLink(
  db: AppDatabase,
  schemeId: string,
  linkId: string | null,
  now = Date.now(),
): Promise<{ ok: true } | { ok: false; reason: "missing" }> {
  return withTransaction(db, async () => {
    if (linkId) {
      const row = await db
        .prepare("SELECT id FROM links WHERE id = ? AND scheme_id = ?")
        .bind(linkId, schemeId)
        .first<{ id: string }>();
      if (!row) return { ok: false, reason: "missing" };
    }
    await db
      .prepare("UPDATE links SET is_owner = 0, updated_at = ? WHERE scheme_id = ? AND is_owner = 1")
      .bind(now, schemeId)
      .run();
    if (linkId) {
      await db.prepare("UPDATE links SET is_owner = 1, updated_at = ? WHERE id = ?").bind(now, linkId).run();
    }
    return { ok: true };
  });
}

export async function reorderLink(
  db: AppDatabase,
  schemeId: string,
  id: string,
  direction: "up" | "down",
  now = Date.now(),
) {
  await withTransaction(db, async () => {
    const links = await listLinks(db, schemeId);
    const settings = await getQueueSettings(db, schemeId);
    const ownerReserved = settings.ownerEvery !== null && links.some((link) => link.owner && link.active);
    const members = links.map(toMember).map((member) =>
      ownerReserved && member.owner ? { ...member, active: false } : member,
    );
    const updated = moveInQueue(members, id, direction);
    const write = db.prepare("UPDATE links SET current_weight = ?, updated_at = ? WHERE id = ?");
    for (const member of updated) {
      if (!member.active) continue;
      await write.bind(member.currentWeight, now, member.id).run();
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

export async function lookupTicket(db: AppDatabase, claimCode: string, now = Date.now()): Promise<TicketView | null> {
  const row = await db
    .prepare(
      `SELECT t.code, t.expires_at, t.consumed_at, l.url, l.code AS referral_code, l.email
       FROM claim_tokens t
       JOIN links l ON l.id = t.link_id
       WHERE t.code = ?`,
    )
    .bind(claimCode)
    .first<{
      code: string;
      expires_at: number;
      consumed_at: number | null;
      url: string;
      referral_code: string;
      email: string;
    }>();

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
export async function seedDemoIfEmpty(db: AppDatabase) {
  const count = await db.prepare("SELECT COUNT(*) AS n FROM links").first<{ n: number }>();
  if (Number(count?.n ?? 0) > 0) return;
  const base = Date.parse("2026-11-16T09:00:00Z");
  const inserted = [];
  for (const [index, link] of DEMO_LINKS.entries()) {
    inserted.push(
      await adminInsertLink(db, {
        schemeId: edfScheme.id,
        email: link.email,
        code: link.code,
        url: `https://www.edfenergy.com/quote/refer-a-friend/${link.code}`,
        boosted: link.boosted,
        now: base + index * 1000,
      }),
    );
  }
  if (inserted[0]?.ok) await setOwnerLink(db, edfScheme.id, inserted[0].id, base);
}

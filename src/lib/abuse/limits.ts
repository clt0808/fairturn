export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** How long a claim code can still boost a new link. */
export const CLAIM_TTL_MS = 120 * DAY_MS;

/** How long rate-limit rows are kept. */
export const RATE_RETENTION_MS = 2 * DAY_MS;

export type LimitRule = { windowMs: number; max: number };

/** Valid submissions (and rejected duplicates) per network. */
export const SUBMIT_RULES: readonly LimitRule[] = [
  { windowMs: HOUR_MS, max: 5 },
  { windowMs: DAY_MS, max: 12 },
];

/** Successful handouts per network, so one visitor cannot drain the queue. */
export const HANDOUT_RULES: readonly LimitRule[] = [
  { windowMs: HOUR_MS, max: 8 },
  { windowMs: DAY_MS, max: 15 },
];

/** Successful boosts per network per day. Tokens are also single-use. */
export const BOOST_RULES: readonly LimitRule[] = [{ windowMs: DAY_MS, max: 2 }];

/** Failed admin password attempts per network. */
export const ADMIN_LOGIN_RULES: readonly LimitRule[] = [{ windowMs: HOUR_MS, max: 8 }];

export function exceedsLimit(
  timestamps: readonly number[],
  now: number,
  rules: readonly LimitRule[],
): boolean {
  return rules.some((rule) => {
    const used = timestamps.filter((stamp) => stamp > now - rule.windowMs && stamp <= now).length;
    return used >= rule.max;
  });
}

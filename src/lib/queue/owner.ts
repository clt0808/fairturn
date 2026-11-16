import { pickNext } from "./pick";
import type { PickOutcome, QueueMember } from "./types";

/** Default reserved slot: turns 3, 6, 9, and so on. */
export const DEFAULT_OWNER_EVERY = 3;

/** Admin may not set an interval above this. */
export const MAX_OWNER_EVERY = 50;

export type OwnerSchedule = {
  /** Handouts already completed. The next turn is this plus one. */
  handoutsSoFar: number;
  /**
   * Hand the owner link out when the turn number is a multiple of this.
   * Null or 0 switches the owner share off.
   */
  ownerEvery: number | null;
};

/**
 * Read a stored interval. Anything below 2 is off, including a blank setting.
 * Values above the admin maximum are clamped.
 */
export function normalizeOwnerEvery(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const interval = Math.trunc(value);
  if (interval < 2) return null;
  return Math.min(interval, MAX_OWNER_EVERY);
}

/** Accept 0 (off) or an integer from 2 to 50. 1 would give the owner every visitor. */
export function parseOwnerEvery(value: number): { ok: true; ownerEvery: number | null } | { ok: false } {
  if (!Number.isInteger(value) || value < 0 || value === 1 || value > MAX_OWNER_EVERY) {
    return { ok: false };
  }
  return { ok: true, ownerEvery: value === 0 ? null : value };
}

export function ordinalWord(interval: number): string {
  const words: Record<number, string> = {
    2: "second",
    3: "third",
    4: "fourth",
    5: "fifth",
    6: "sixth",
    7: "seventh",
    8: "eighth",
    9: "ninth",
    10: "tenth",
  };
  if (words[interval]) return words[interval];
  const mod100 = interval % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${interval}th`;
  switch (interval % 10) {
    case 1:
      return `${interval}st`;
    case 2:
      return `${interval}nd`;
    case 3:
      return `${interval}rd`;
    default:
      return `${interval}th`;
  }
}

/**
 * Honest public description of the owner share.
 * Says the share is off when there is no active owner link, or the interval is off.
 */
export function ownerShareCopy(ownerEvery: number | null, hasActiveOwner: boolean): string {
  const every = normalizeOwnerEvery(ownerEvery);
  if (!hasActiveOwner || every === null) return "";
  return "The site owner's own link is included in the rotation.";
}

function activeOwner(members: readonly QueueMember[]): QueueMember | undefined {
  return members.find((member) => member.owner && member.active);
}

/**
 * Hand out the next link.
 *
 * When an owner link is active and the interval is on, turn numbers 3, 6, 9
 * (for an interval of 3) go to that link. Those turns only add one to the
 * owner’s handout count. They do not run the weighted rotation, so nobody
 * else’s current weight changes.
 *
 * Every other turn runs the usual rotation on everyone except the owner.
 * With the share off, or with no active owner link, this is the same as
 * `pickNext` on the whole list.
 *
 * If the owner is the only active link, they are handed out on the other
 * turns as well, so the queue does not sit empty. The input array is not mutated.
 */
export function handOutNext(members: readonly QueueMember[], schedule: OwnerSchedule): PickOutcome | null {
  const working = members.map((member) => ({ ...member }));
  const every = normalizeOwnerEvery(schedule.ownerEvery);
  const owner = activeOwner(working);
  const turn = schedule.handoutsSoFar + 1;
  const reserved = Boolean(owner && every && turn % every === 0);

  if (reserved && owner) {
    owner.handouts += 1;
    return { pickedId: owner.id, members: working };
  }

  const pool = every && owner ? working.filter((member) => member !== owner) : working;
  const picked = pickNext(pool);
  if (!picked) {
    if (!owner) return null;
    owner.handouts += 1;
    return { pickedId: owner.id, members: working };
  }

  const updated = new Map(picked.members.map((member) => [member.id, member]));
  return {
    pickedId: picked.pickedId,
    members: working.map((member) => updated.get(member.id) ?? member),
  };
}

/** Upcoming handout ids, including reserved owner turns. */
export function previewHandouts(
  members: readonly QueueMember[],
  count: number,
  schedule: OwnerSchedule,
): string[] {
  const ids: string[] = [];
  let state: readonly QueueMember[] = members;
  let handoutsSoFar = schedule.handoutsSoFar;
  const steps = Math.max(0, Math.floor(count));

  for (let step = 0; step < steps; step += 1) {
    const result = handOutNext(state, { handoutsSoFar, ownerEvery: schedule.ownerEvery });
    if (!result) break;
    ids.push(result.pickedId);
    state = result.members;
    handoutsSoFar += 1;
  }

  return ids;
}

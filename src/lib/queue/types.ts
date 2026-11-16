/**
 * A member of a fair referral queue.
 *
 * The queue module does not know which energy supplier a member belongs to.
 * Callers filter to one scheme, then pass that list in.
 */
export type QueueMember = {
  id: string;
  /**
   * Positive integer share of future handouts.
   * 1 is a standard place. 2 is a boosted place. Never higher.
   */
  weight: number;
  /**
   * Running score for smooth weighted round-robin. May be negative.
   * This is what keeps the rotation fair across calls.
   */
  currentWeight: number;
  handouts: number;
  /** Unix epoch milliseconds. Older members win a tie. */
  createdAt: number;
  active: boolean;
};

export type PickOutcome = {
  pickedId: string;
  members: QueueMember[];
};

/** Older members, then id, so ties are stable and testable. */
export function compareIdentity(a: QueueMember, b: QueueMember): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

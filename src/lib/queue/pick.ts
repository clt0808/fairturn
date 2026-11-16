import { compareIdentity, type PickOutcome, type QueueMember } from "./types";

/**
 * Choose the next referral link.
 *
 * This is the smooth weighted round-robin used by nginx, kept in integers
 * so it can live in SQLite between requests.
 *
 * On each handout, for every active member:
 *   1. Add their weight to their current weight.
 *   2. Offer the member with the highest current weight.
 *      Ties go to the older member, then the lower id.
 *   3. Subtract the sum of active weights from the member who was offered.
 *
 * A standard link has weight 1. A boosted link has weight 2, so across a
 * full cycle it is offered about twice as often. Equal weights take strictly
 * equal turns. A new member starts at current weight 0: they join the
 * rotation, they do not wipe turns already owed to everyone else.
 *
 * Inactive members are left untouched. The input array is never mutated.
 */
export function pickNext(members: readonly QueueMember[]): PickOutcome | null {
  const working = members.map((member) => ({ ...member }));
  const order = working
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.active && member.weight > 0)
    .sort((a, b) => compareIdentity(a.member, b.member));

  if (order.length === 0) return null;

  let total = 0;
  let bestIndex = order[0].index;

  for (const { member, index } of order) {
    member.currentWeight += member.weight;
    total += member.weight;
    if (member.currentWeight > working[bestIndex].currentWeight) {
      bestIndex = index;
    }
  }

  const picked = working[bestIndex];
  picked.currentWeight -= total;
  picked.handouts += 1;

  return { pickedId: picked.id, members: working };
}

/** Ids that would be handed out next, without the caller having to loop. */
export function previewSequence(members: readonly QueueMember[], count: number): string[] {
  const ids: string[] = [];
  let state: readonly QueueMember[] = members;
  const steps = Math.max(0, Math.floor(count));

  for (let step = 0; step < steps; step += 1) {
    const result = pickNext(state);
    if (!result) break;
    ids.push(result.pickedId);
    state = result.members;
  }

  return ids;
}

import type { QueueMember } from "./types";

/** Share of handouts for a link that has not been boosted. */
export const STANDARD_WEIGHT = 1;

/**
 * Share of handouts for someone who joined through a link this site handed
 * out, then added their own. About twice a standard link.
 */
export const BOOSTED_WEIGHT = 2;

/** Boosts do not stack, and nothing in the queue is allowed past this. */
export const MAX_WEIGHT = 2;

export function isBoostedWeight(weight: number): boolean {
  return weight >= BOOSTED_WEIGHT;
}

/**
 * Raise a member to boosted priority, once.
 * Current weight and handout history are left as they are, so the boost
 * changes future share without deleting turns other people are already owed.
 * A second grant is refused and the weight is capped.
 */
export function grantBoost(member: QueueMember): { member: QueueMember; granted: boolean } {
  if (member.weight >= BOOSTED_WEIGHT) {
    return {
      member: { ...member, weight: Math.min(member.weight, MAX_WEIGHT) },
      granted: false,
    };
  }

  return {
    member: { ...member, weight: BOOSTED_WEIGHT },
    granted: true,
  };
}

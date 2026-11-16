import { compareIdentity, type QueueMember } from "./types";

/** Score used for the *next* offer: current weight plus the weight about to be added. */
export function nextScore(member: QueueMember): number {
  return member.currentWeight + member.weight;
}

/**
 * Active members in the order they would be offered if each were due
 * purely on their current score. The first id matches `pickNext`.
 */
export function rankForNextPick(members: readonly QueueMember[]): QueueMember[] {
  return members
    .filter((member) => member.active && member.weight > 0)
    .map((member) => ({ ...member }))
    .sort((a, b) => {
      const byScore = nextScore(b) - nextScore(a);
      if (byScore !== 0) return byScore;
      return compareIdentity(a, b);
    });
}

/**
 * Move a member one place up or down the next-up order.
 *
 * Weights are not changed. To make the new order stick for the following
 * handout, active members are given a fresh, strictly decreasing score
 * ladder. That is an admin override of who is due next; the usual weights
 * apply again on later handouts.
 *
 * Moving the first member up, or the last member down, changes nothing.
 */
export function moveInQueue(
  members: readonly QueueMember[],
  id: string,
  direction: "up" | "down",
): QueueMember[] {
  const next = members.map((member) => ({ ...member }));
  const ranked = rankForNextPick(next);
  const index = ranked.findIndex((member) => member.id === id);
  if (index < 0) return next;

  const neighbourIndex = direction === "up" ? index - 1 : index + 1;
  if (neighbourIndex < 0 || neighbourIndex >= ranked.length) return next;

  const order = ranked.map((member) => member.id);
  const swapped = order[index];
  order[index] = order[neighbourIndex];
  order[neighbourIndex] = swapped;

  const top = Math.max(...ranked.map((member) => nextScore(member)));
  for (const [position, memberId] of order.entries()) {
    const member = next.find((item) => item.id === memberId);
    if (!member) continue;
    member.currentWeight = top - position - member.weight;
  }

  return next;
}

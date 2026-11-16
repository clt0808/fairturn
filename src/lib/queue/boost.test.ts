import { describe, expect, it } from "vitest";
import { BOOSTED_WEIGHT, grantBoost, MAX_WEIGHT, STANDARD_WEIGHT } from "./boost";
import { pickNext } from "./pick";
import type { QueueMember } from "./types";

function member(id: string, createdAt: number, weight = STANDARD_WEIGHT): QueueMember {
  return { id, weight, currentWeight: 0, handouts: 0, createdAt, active: true };
}

describe("boost rule", () => {
  it("raises a standard link to weight 2, once", () => {
    const before = member("a", 1);
    const first = grantBoost(before);
    expect(first.granted).toBe(true);
    expect(first.member.weight).toBe(BOOSTED_WEIGHT);
    expect(first.member.currentWeight).toBe(before.currentWeight);
    expect(first.member.handouts).toBe(before.handouts);

    const second = grantBoost(first.member);
    expect(second.granted).toBe(false);
    expect(second.member.weight).toBe(MAX_WEIGHT);
  });

  it("caps a weight that is already above the maximum", () => {
    const inflated = { ...member("a", 1), weight: 9 };
    const result = grantBoost(inflated);
    expect(result.granted).toBe(false);
    expect(result.member.weight).toBe(MAX_WEIGHT);
  });

  it("changes future share without resetting other members", () => {
    let state = [member("a", 1), member("b", 2), member("c", 3)];
    for (let turn = 0; turn < 3; turn += 1) {
      state = pickNext(state)!.members;
    }
    const beforeBoost = structuredClone(state);
    const boosted = grantBoost(state.find((item) => item.id === "b")!);
    expect(boosted.granted).toBe(true);
    state = state.map((item) => (item.id === "b" ? boosted.member : item));

    expect(state.find((item) => item.id === "a")).toEqual(beforeBoost.find((item) => item.id === "a"));
    expect(state.find((item) => item.id === "c")).toEqual(beforeBoost.find((item) => item.id === "c"));
    expect(state.find((item) => item.id === "b")?.currentWeight).toBe(
      beforeBoost.find((item) => item.id === "b")?.currentWeight,
    );

    const counts = { a: 0, b: 0, c: 0 };
    for (let turn = 0; turn < 12; turn += 1) {
      const result = pickNext(state)!;
      counts[result.pickedId as "a" | "b" | "c"] += 1;
      state = result.members;
    }

    expect(counts.b).toBeGreaterThan(counts.a);
    expect(counts.b).toBeGreaterThan(counts.c);
    expect(counts.b).toBe(6);
    expect(counts.a + counts.c).toBe(6);
  });
});

import { describe, expect, it } from "vitest";
import { pickNext, previewSequence } from "./pick";
import type { QueueMember } from "./types";

function member(partial: Partial<QueueMember> & Pick<QueueMember, "id">): QueueMember {
  return {
    weight: 1,
    currentWeight: 0,
    handouts: 0,
    createdAt: 0,
    active: true,
    ...partial,
  };
}

function cycle(members: QueueMember[], turns: number): { ids: string[]; state: QueueMember[] } {
  const ids: string[] = [];
  let state = members;
  for (let turn = 0; turn < turns; turn += 1) {
    const result = pickNext(state);
    expect(result).not.toBeNull();
    ids.push(result!.pickedId);
    state = result!.members;
  }
  return { ids, state };
}

describe("pickNext rotation", () => {
  it("gives equal links strictly equal turns, in join order", () => {
    const start = [
      member({ id: "a", createdAt: 1 }),
      member({ id: "b", createdAt: 2 }),
      member({ id: "c", createdAt: 3 }),
    ];

    const { ids, state } = cycle(start, 6);

    expect(ids).toEqual(["a", "b", "c", "a", "b", "c"]);
    expect(state.map((item) => item.handouts)).toEqual([2, 2, 2]);
  });

  it("does not let one equal link pull ahead by more than a single turn", () => {
    const start = [
      member({ id: "a", createdAt: 1 }),
      member({ id: "b", createdAt: 2 }),
      member({ id: "c", createdAt: 3 }),
      member({ id: "d", createdAt: 4 }),
    ];
    const { state } = cycle(start, 40);
    const counts = state.map((item) => item.handouts);
    expect(Math.max(...counts) - Math.min(...counts)).toBe(0);
  });

  it("offers a boosted link about twice as often as each standard link", () => {
    const start = [
      member({ id: "boosted", weight: 2, createdAt: 1 }),
      member({ id: "standard-b", createdAt: 2 }),
      member({ id: "standard-c", createdAt: 3 }),
    ];

    const { ids, state } = cycle(start, 8);

    expect(ids).toEqual([
      "boosted",
      "standard-b",
      "standard-c",
      "boosted",
      "boosted",
      "standard-b",
      "standard-c",
      "boosted",
    ]);
    expect(Object.fromEntries(state.map((item) => [item.id, item.handouts]))).toEqual({
      boosted: 4,
      "standard-b": 2,
      "standard-c": 2,
    });
  });

  it("shares a boosted weight fairly between two boosted links", () => {
    const start = [
      member({ id: "boost-a", weight: 2, createdAt: 1 }),
      member({ id: "boost-b", weight: 2, createdAt: 2 }),
      member({ id: "standard", createdAt: 3 }),
    ];
    const turns = 5 * 8;
    const { state } = cycle(start, turns);
    expect(Object.fromEntries(state.map((item) => [item.id, item.handouts]))).toEqual({
      "boost-a": 16,
      "boost-b": 16,
      standard: 8,
    });
  });

  it("skips inactive links and leaves their score untouched", () => {
    const paused = member({ id: "paused", currentWeight: 7, handouts: 3, active: false, createdAt: 1 });
    const start = [paused, member({ id: "live", createdAt: 2 })];
    const { ids, state } = cycle(start, 3);
    expect(ids).toEqual(["live", "live", "live"]);
    const stillPaused = state.find((item) => item.id === "paused");
    expect(stillPaused).toMatchObject({ currentWeight: 7, handouts: 3, active: false });
  });

  it("returns null when nobody is active", () => {
    expect(pickNext([])).toBeNull();
    expect(pickNext([member({ id: "a", active: false })])).toBeNull();
    expect(pickNext([member({ id: "a", weight: 0 })])).toBeNull();
  });

  it("does not mutate the array it was given", () => {
    const start = [member({ id: "a", createdAt: 1 }), member({ id: "b", createdAt: 2 })];
    const snapshot = structuredClone(start);
    pickNext(start);
    expect(start).toEqual(snapshot);
  });

  it("breaks score ties by join time, then id", () => {
    const sameTime = [
      member({ id: "b", createdAt: 5 }),
      member({ id: "a", createdAt: 5 }),
    ];
    expect(pickNext(sameTime)?.pickedId).toBe("a");
  });

  it("previews the same sequence as repeated picks", () => {
    const start = [
      member({ id: "boosted", weight: 2, createdAt: 1 }),
      member({ id: "b", createdAt: 2 }),
      member({ id: "c", createdAt: 3 }),
    ];
    expect(previewSequence(start, 8)).toEqual(cycle(start, 8).ids);
    expect(previewSequence(start, 0)).toEqual([]);
  });
});

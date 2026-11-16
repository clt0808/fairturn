import { describe, expect, it } from "vitest";
import { pickNext } from "./pick";
import { moveInQueue, rankForNextPick } from "./reorder";
import type { QueueMember } from "./types";

function member(id: string, createdAt: number, weight = 1): QueueMember {
  return { id, weight, currentWeight: 0, handouts: 0, createdAt, active: true };
}

describe("admin reorder", () => {
  const start = [member("a", 1), member("b", 2), member("c", 3, 2)];

  it("agrees with the next handout before anyone is moved", () => {
    expect(rankForNextPick(start).map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(pickNext(start)?.pickedId).toBe("c");
  });

  it("moves a link one place and makes that the next handout order", () => {
    const moved = moveInQueue(start, "a", "up");
    expect(rankForNextPick(moved).map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(pickNext(moved)?.pickedId).toBe("a");
    expect(moved.map((item) => item.weight)).toEqual([1, 1, 2]);
  });

  it("moves a link down one place", () => {
    const moved = moveInQueue(start, "c", "down");
    expect(rankForNextPick(moved).map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("leaves the ends where they are", () => {
    expect(moveInQueue(start, "c", "up")).toEqual(start);
    expect(moveInQueue(start, "b", "down")).toEqual(start);
  });

  it("ignores an inactive link or an unknown id", () => {
    const withPaused = [...start, member("z", 4, 1)];
    withPaused[3] = { ...withPaused[3], active: false };
    expect(moveInQueue(withPaused, "z", "up")).toEqual(withPaused);
    expect(moveInQueue(start, "missing", "down")).toEqual(start);
  });
});

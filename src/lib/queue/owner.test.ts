import { describe, expect, it } from "vitest";
import { handOutNext, ownerShareCopy, parseOwnerEvery, previewHandouts } from "./owner";
import { pickNext } from "./pick";
import type { QueueMember } from "./types";

function member(partial: Partial<QueueMember> & Pick<QueueMember, "id">): QueueMember {
  return {
    weight: 1,
    currentWeight: 0,
    handouts: 0,
    createdAt: 0,
    active: true,
    owner: false,
    ...partial,
  };
}

function run(members: QueueMember[], turns: number, ownerEvery: number | null) {
  const ids: string[] = [];
  let state = members;
  for (let turn = 0; turn < turns; turn += 1) {
    const result = handOutNext(state, { handoutsSoFar: turn, ownerEvery });
    expect(result).not.toBeNull();
    ids.push(result!.pickedId);
    state = result!.members;
  }
  return { ids, state };
}

function fairOnly(members: QueueMember[], turns: number) {
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

describe("owner share", () => {
  const owner = member({ id: "owner", createdAt: 3, owner: true });
  const a = member({ id: "a", createdAt: 1 });
  const b = member({ id: "b", createdAt: 2 });

  it("gives the owner turns 3, 6 and 9, and alternates everyone else", () => {
    const { ids, state } = run([owner, a, b], 9, 3);

    expect(ids).toEqual(["a", "b", "owner", "a", "b", "owner", "a", "b", "owner"]);
    expect(ids.filter((_, index) => (index + 1) % 3 === 0)).toEqual(["owner", "owner", "owner"]);

    const fair = fairOnly([a, b], 6);
    const scores = Object.fromEntries(state.map((item) => [item.id, item.currentWeight]));
    const fairScores = Object.fromEntries(fair.state.map((item) => [item.id, item.currentWeight]));
    expect(scores.a).toBe(fairScores.a);
    expect(scores.b).toBe(fairScores.b);
    expect(scores.owner).toBe(0);
    expect(state.find((item) => item.id === "owner")?.handouts).toBe(3);
  });

  it("keeps a boosted share on the turns that are not reserved", () => {
    const boosted = member({ id: "a", createdAt: 1, weight: 2 });
    const standard = member({ id: "b", createdAt: 2 });
    const { ids } = run([owner, boosted, standard], 9, 3);

    expect(ids).toEqual(["a", "b", "owner", "a", "a", "owner", "b", "a", "owner"]);

    const fairIds = ids.filter((id) => id !== "owner");
    expect(fairIds).toEqual(fairOnly([boosted, standard], fairIds.length).ids);
    expect(fairIds.filter((id) => id === "a").length).toBe(4);
    expect(fairIds.filter((id) => id === "b").length).toBe(2);

    const beforeOwnerTurn = handOutNext(
      handOutNext([owner, boosted, standard], { handoutsSoFar: 0, ownerEvery: 3 })!.members,
      { handoutsSoFar: 1, ownerEvery: 3 },
    )!;
    const afterOwnerTurn = handOutNext(beforeOwnerTurn.members, { handoutsSoFar: 2, ownerEvery: 3 })!;
    expect(afterOwnerTurn.pickedId).toBe("owner");
    for (const id of ["a", "b"]) {
      expect(afterOwnerTurn.members.find((item) => item.id === id)?.currentWeight).toBe(
        beforeOwnerTurn.members.find((item) => item.id === id)?.currentWeight,
      );
    }
  });

  it("matches the plain rotation when there is no active owner link", () => {
    const start = [a, b, member({ id: "c", createdAt: 3 })];
    const pausedOwner = member({ id: "owner", createdAt: 4, owner: true, active: false, currentWeight: 4 });
    const withPaused = run([pausedOwner, ...start], 6, 3);
    const plain = fairOnly(start, 6);

    expect(withPaused.ids).toEqual(plain.ids);
    expect(withPaused.state.find((item) => item.id === "owner")).toMatchObject({
      currentWeight: 4,
      handouts: 0,
      active: false,
    });
    expect(run(start, 6, 3).ids).toEqual(plain.ids);
    expect(previewHandouts(start, 6, { handoutsSoFar: 0, ownerEvery: 3 })).toEqual(plain.ids);
  });

  it("puts the owner back in the fair rotation when the share is off", () => {
    const start = [owner, a, b];
    const { ids } = run(start, 6, null);
    expect(ids).toEqual(fairOnly(start, 6).ids);
    expect(ids.filter((id) => id === "owner")).toHaveLength(2);
  });

  it("still hands out a queue that contains only the owner", () => {
    expect(run([owner], 4, 3).ids).toEqual(["owner", "owner", "owner", "owner"]);
  });

  it("uses the configured interval", () => {
    const { ids } = run([owner, a, b], 8, 4);
    expect(ids[3]).toBe("owner");
    expect(ids[7]).toBe("owner");
    expect(ids.filter((id) => id === "owner")).toEqual(["owner", "owner"]);
  });

  it("does not mutate the members it was given", () => {
    const start = [owner, a, b];
    const snapshot = structuredClone(start);
    handOutNext(start, { handoutsSoFar: 2, ownerEvery: 3 });
    expect(start).toEqual(snapshot);
  });
});

describe("owner share setting", () => {
  it("rejects an interval of 1 and accepts off or every third", () => {
    expect(parseOwnerEvery(0)).toEqual({ ok: true, ownerEvery: null });
    expect(parseOwnerEvery(1)).toEqual({ ok: false });
    expect(parseOwnerEvery(3)).toEqual({ ok: true, ownerEvery: 3 });
    expect(parseOwnerEvery(51)).toEqual({ ok: false });
  });

  it("describes an active every-third share, and says when it is off", () => {
    expect(ownerShareCopy(3, true)).toContain("every third turn");
    expect(ownerShareCopy(3, true)).toContain("because they run the site");
    expect(ownerShareCopy(3, false)).toContain("off at the moment");
    expect(ownerShareCopy(null, true)).toContain("off at the moment");
  });
});

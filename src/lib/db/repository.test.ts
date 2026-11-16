import { describe, expect, it } from "vitest";
import { edfScheme } from "@/lib/schemes/edf";
import {
  adminInsertLink,
  createAppDatabase,
  handOutLink,
  listLinks,
  reorderLink,
  setLinkActive,
  setOwnerEvery,
  setOwnerLink,
  submitLink,
} from "./repository";

const schemeId = edfScheme.id;
const base = Date.parse("2026-11-16T10:00:00Z");

function url(code: string) {
  return `https://www.edfenergy.com/quote/refer-a-friend/${code}`;
}

describe("queue persistence", () => {
  it("rotates standard links equally and keeps the score between handouts", () => {
    const db = createAppDatabase();
    for (const [index, code] of ["amber-lark-2401", "quiet-brook-1184", "mild-harbor-5520"].entries()) {
      const inserted = adminInsertLink(db, {
        schemeId,
        email: `person${index}@example.com`,
        code,
        url: url(code),
        boosted: false,
        now: base + index,
      });
      expect(inserted.ok).toBe(true);
    }

    const handed = [];
    for (let turn = 0; turn < 6; turn += 1) {
      const result = handOutLink(db, { schemeId, ipHash: "ip", now: base + 100 + turn });
      expect(result.ok).toBe(true);
      if (result.ok) handed.push(result.code);
    }

    expect(handed).toEqual([
      "amber-lark-2401",
      "quiet-brook-1184",
      "mild-harbor-5520",
      "amber-lark-2401",
      "quiet-brook-1184",
      "mild-harbor-5520",
    ]);
    expect(listLinks(db, schemeId).map((link) => link.handouts)).toEqual([2, 2, 2]);
  });

  it("gives a boosted link about twice the handouts", () => {
    const db = createAppDatabase();
    const rows = [
      { email: "a@example.com", code: "amber-lark-2401", boosted: true },
      { email: "b@example.com", code: "quiet-brook-1184", boosted: false },
      { email: "c@example.com", code: "mild-harbor-5520", boosted: false },
    ];
    rows.forEach((row, index) => {
      adminInsertLink(db, { schemeId, ...row, url: url(row.code), now: base + index });
    });

    const handed = [];
    for (let turn = 0; turn < 8; turn += 1) {
      const result = handOutLink(db, { schemeId, ipHash: "ip", now: base + 50 + turn });
      if (result.ok) handed.push(result.code);
    }

    expect(handed.filter((code) => code === "amber-lark-2401")).toHaveLength(4);
    expect(handed.filter((code) => code === "quiet-brook-1184")).toHaveLength(2);
    expect(handed.filter((code) => code === "mild-harbor-5520")).toHaveLength(2);
  });

  it("boosts a new link from a claim code, once, and refuses the same link", () => {
    const db = createAppDatabase();
    adminInsertLink(db, {
      schemeId,
      email: "owner@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      boosted: false,
      now: base,
    });

    const first = handOutLink(db, {
      schemeId,
      ipHash: "visitor",
      now: base + 1,
      newClaimCode: () => "ABCD2345",
    });
    expect(first.ok).toBe(true);

    const boosted = submitLink(db, {
      schemeId,
      email: "joiner@example.com",
      code: "quiet-brook-1184",
      url: url("quiet-brook-1184"),
      claimCode: "ABCD2345",
      ipHash: "visitor",
      now: base + 2,
    });
    expect(boosted).toEqual({ ok: true, boosted: true, id: expect.any(String) });

    const again = submitLink(db, {
      schemeId,
      email: "second@example.com",
      code: "mild-harbor-5520",
      url: url("mild-harbor-5520"),
      claimCode: "ABCD2345",
      ipHash: "other",
      now: base + 3,
    });
    expect(again).toMatchObject({ ok: false, reason: "claim-used" });

    setLinkActive(db, listLinks(db, schemeId)[0].id, false, base + 4);
    const self = submitLink(db, {
      schemeId,
      email: "new-owner@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      claimCode: "ABCD2345",
      ipHash: "other",
      now: base + 5,
    });
    expect(self).toMatchObject({ ok: false, reason: "claim-used" });
  });

  it("rejects a claim code used on the same referral link", () => {
    const db = createAppDatabase();
    const inserted = adminInsertLink(db, {
      schemeId,
      email: "owner@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      boosted: false,
      now: base,
    });
    expect(inserted.ok).toBe(true);
    handOutLink(db, { schemeId, ipHash: "visitor", now: base + 1, newClaimCode: () => "WXYZ6789" });
    if (inserted.ok) setLinkActive(db, inserted.id, false, base + 2);

    const self = submitLink(db, {
      schemeId,
      email: "someone@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      claimCode: "WXYZ6789",
      ipHash: "visitor",
      now: base + 3,
    });
    expect(self).toMatchObject({ ok: false, reason: "claim-self" });
    expect(listLinks(db, schemeId).filter((link) => link.active)).toHaveLength(0);
  });

  it("allows one active link per email and one copy of each code", () => {
    const db = createAppDatabase();
    const first = submitLink(db, {
      schemeId,
      email: "Ada@Example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      claimCode: null,
      ipHash: "ip",
      now: base,
    });
    expect(first.ok).toBe(true);

    expect(
      submitLink(db, {
        schemeId,
        email: "ada@example.com",
        code: "quiet-brook-1184",
        url: url("quiet-brook-1184"),
        claimCode: null,
        ipHash: "ip",
        now: base + 1,
      }),
    ).toMatchObject({ reason: "email-taken" });

    expect(
      submitLink(db, {
        schemeId,
        email: "other@example.com",
        code: "amber-lark-2401",
        url: url("amber-lark-2401"),
        claimCode: null,
        ipHash: "ip",
        now: base + 2,
      }),
    ).toMatchObject({ reason: "code-taken" });
  });

  it("caps boosts at two successful claims per network per day", () => {
    const db = createAppDatabase();
    adminInsertLink(db, {
      schemeId,
      email: "owner@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      boosted: false,
      now: base,
    });

    for (let index = 0; index < 3; index += 1) {
      const handed = handOutLink(db, {
        schemeId,
        ipHash: "visitor",
        now: base + 10 + index,
        newClaimCode: () => `CODE${index}234`,
      });
      expect(handed.ok).toBe(true);
    }

    for (let index = 0; index < 2; index += 1) {
      const result = submitLink(db, {
        schemeId,
        email: `joiner${index}@example.com`,
        code: index === 0 ? "quiet-brook-1184" : "mild-harbor-5520",
        url: url(index === 0 ? "quiet-brook-1184" : "mild-harbor-5520"),
        claimCode: `CODE${index}234`,
        ipHash: "visitor",
        now: base + 20 + index,
      });
      expect(result).toMatchObject({ ok: true, boosted: true });
    }

    const capped = submitLink(db, {
      schemeId,
      email: "joiner2@example.com",
      code: "copper-fern-9033",
      url: url("copper-fern-9033"),
      claimCode: "CODE2234",
      ipHash: "visitor",
      now: base + 30,
    });
    expect(capped).toMatchObject({ ok: false, reason: "boost-cap" });
  });

  it("stops a network handing out links once the hourly cap is reached", () => {
    const db = createAppDatabase();
    adminInsertLink(db, {
      schemeId,
      email: "owner@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      boosted: false,
      now: base,
    });
    for (let turn = 0; turn < 8; turn += 1) {
      expect(handOutLink(db, { schemeId, ipHash: "busy", now: base + turn }).ok).toBe(true);
    }
    expect(handOutLink(db, { schemeId, ipHash: "busy", now: base + 8 })).toMatchObject({ reason: "rate" });
    expect(handOutLink(db, { schemeId, ipHash: "someone-else", now: base + 9 }).ok).toBe(true);
  });

  it("lets an admin move the next link", () => {
    const db = createAppDatabase();
    const ids: string[] = [];
    for (const [index, code] of ["amber-lark-2401", "quiet-brook-1184"].entries()) {
      const inserted = adminInsertLink(db, {
        schemeId,
        email: `p${index}@example.com`,
        code,
        url: url(code),
        boosted: false,
        now: base + index,
      });
      if (inserted.ok) ids.push(inserted.id);
    }
    reorderLink(db, schemeId, ids[0], "down", base + 5);
    const next = handOutLink(db, { schemeId, ipHash: "ip", now: base + 6 });
    expect(next).toMatchObject({ ok: true, code: "quiet-brook-1184" });
  });

  it("reserves every third handout for the owner without moving the others’ scores", () => {
    const db = createAppDatabase();
    const owner = adminInsertLink(db, {
      schemeId,
      email: "owner@example.com",
      code: "calm-pebble-2208",
      url: url("calm-pebble-2208"),
      boosted: false,
      now: base,
    });
    const linkA = adminInsertLink(db, {
      schemeId,
      email: "a@example.com",
      code: "amber-lark-2401",
      url: url("amber-lark-2401"),
      boosted: false,
      now: base + 1,
    });
    adminInsertLink(db, {
      schemeId,
      email: "b@example.com",
      code: "quiet-brook-1184",
      url: url("quiet-brook-1184"),
      boosted: false,
      now: base + 2,
    });
    expect(owner.ok && linkA.ok).toBe(true);
    if (!owner.ok) return;
    expect(setOwnerLink(db, schemeId, owner.id, base + 3)).toEqual({ ok: true });
    expect(setOwnerEvery(db, schemeId, 3)).toMatchObject({ ok: true, ownerEvery: 3 });
    expect(setOwnerLink(db, schemeId, linkA.ok ? linkA.id : owner.id, base + 4).ok).toBe(true);
    expect(setOwnerLink(db, schemeId, owner.id, base + 5)).toEqual({ ok: true });
    expect(listLinks(db, schemeId).filter((link) => link.owner).map((link) => link.email)).toEqual([
      "owner@example.com",
    ]);

    const handed: string[] = [];
    for (let turn = 0; turn < 9; turn += 1) {
      const result = handOutLink(db, { schemeId, ipHash: `ip-${turn}`, now: base + 10 + turn });
      expect(result.ok).toBe(true);
      if (result.ok) handed.push(result.code);
    }

    expect(handed).toEqual([
      "amber-lark-2401",
      "quiet-brook-1184",
      "calm-pebble-2208",
      "amber-lark-2401",
      "quiet-brook-1184",
      "calm-pebble-2208",
      "amber-lark-2401",
      "quiet-brook-1184",
      "calm-pebble-2208",
    ]);
    const scores = Object.fromEntries(listLinks(db, schemeId).map((link) => [link.code, link.currentWeight]));
    expect(scores["calm-pebble-2208"]).toBe(0);
  });
});

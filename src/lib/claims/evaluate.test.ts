import { describe, expect, it } from "vitest";
import { claimCodeAlphabet, formatClaimCode, generateClaimCode, normalizeClaimCode } from "./code";
import { evaluateClaim, type StoredToken } from "./evaluate";

const now = Date.parse("2026-11-16T12:00:00Z");

function token(partial: Partial<StoredToken> = {}): StoredToken {
  return {
    id: "token-1",
    code: "ABCD2345",
    handedCode: "amber-lark-2401",
    expiresAt: now + 1000,
    consumedAt: null,
    ...partial,
  };
}

describe("claim codes", () => {
  it("normalises and formats an 8-character code", () => {
    expect(normalizeClaimCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(formatClaimCode("abcd2345")).toBe("ABCD-2345");
  });

  it("avoids ambiguous characters", () => {
    const alphabet = claimCodeAlphabet();
    expect(alphabet).not.toMatch(/[01IO]/);
    for (let i = 0; i < 20; i += 1) {
      const code = generateClaimCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });
});

describe("evaluateClaim", () => {
  it("treats a blank code as a standard join", () => {
    expect(evaluateClaim({
      rawCode: "  ",
      token: null,
      submittedReferralCode: "quiet-brook-1184",
      alreadyBoosted: false,
      now,
    })).toEqual({ outcome: "absent" });
  });

  it("accepts a live code for a different link", () => {
    expect(evaluateClaim({
      rawCode: "abcd-2345",
      token: token(),
      submittedReferralCode: "quiet-brook-1184",
      alreadyBoosted: false,
      now,
    })).toEqual({ outcome: "accept", tokenId: "token-1" });
  });

  it("rejects an unknown, used, or expired code", () => {
    const base = {
      rawCode: "ABCD2345",
      submittedReferralCode: "quiet-brook-1184",
      alreadyBoosted: false,
      now,
    };
    expect(evaluateClaim({ ...base, token: null }).outcome).toBe("reject");
    expect(evaluateClaim({ ...base, token: token({ consumedAt: now - 1 }) })).toMatchObject({ reason: "used" });
    expect(evaluateClaim({ ...base, token: token({ expiresAt: now }) })).toMatchObject({ reason: "expired" });
  });

  it("rejects boosting the same link the code was issued for", () => {
    expect(evaluateClaim({
      rawCode: "ABCD2345",
      token: token(),
      submittedReferralCode: "amber-lark-2401",
      alreadyBoosted: false,
      now,
    })).toMatchObject({ reason: "self" });
  });

  it("rejects a second boost", () => {
    expect(evaluateClaim({
      rawCode: "ABCD2345",
      token: token(),
      submittedReferralCode: "quiet-brook-1184",
      alreadyBoosted: true,
      now,
    })).toMatchObject({ reason: "already" });
  });
});

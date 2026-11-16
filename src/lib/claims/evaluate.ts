export type StoredToken = {
  id: string;
  /** Normalised 8-character code. */
  code: string;
  /** Referral code that was handed out when this token was issued. */
  handedCode: string;
  expiresAt: number;
  consumedAt: number | null;
};

export type ClaimRejectReason = "unknown" | "expired" | "used" | "self" | "already";

export type ClaimDecision =
  | { outcome: "absent" }
  | { outcome: "accept"; tokenId: string }
  | { outcome: "reject"; reason: ClaimRejectReason };

/**
 * Decide whether a claim code can boost a newly submitted link.
 *
 * The code is an honour-system token. It proves this site handed someone a
 * link, not that EDF accepted a switch. A blank code means "join at the
 * standard priority" and is not an error.
 */
export function evaluateClaim(input: {
  rawCode: string | null | undefined;
  token: StoredToken | null;
  submittedReferralCode: string;
  alreadyBoosted: boolean;
  now: number;
}): ClaimDecision {
  if (!input.rawCode || !input.rawCode.trim()) return { outcome: "absent" };

  const normalized = input.rawCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!input.token || input.token.code !== normalized) {
    return { outcome: "reject", reason: "unknown" };
  }
  if (input.token.consumedAt !== null) return { outcome: "reject", reason: "used" };
  if (input.token.expiresAt <= input.now) return { outcome: "reject", reason: "expired" };
  if (input.token.handedCode === input.submittedReferralCode) {
    return { outcome: "reject", reason: "self" };
  }
  if (input.alreadyBoosted) return { outcome: "reject", reason: "already" };
  return { outcome: "accept", tokenId: input.token.id };
}

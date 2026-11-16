export type ParseResult =
  | { ok: true; code: string; canonicalUrl: string }
  | { ok: false; error: string };

export type OfferPhase = "upcoming" | "live" | "ended";

/**
 * One supplier's referral scheme.
 * Adding Octopus (or anyone else) means a new module that implements this,
 * plus a registration in the scheme list. The queue itself stays unchanged.
 */
export type ReferralScheme = {
  id: string;
  supplierName: string;
  schemeName: string;
  referrerReward: string;
  newCustomerReward: string;
  /** Inclusive calendar dates, YYYY-MM-DD, in Europe/London. */
  offerStart: string;
  offerEnd: string;
  offerStartLabel: string;
  offerEndLabel: string;
  offerUrl: string;
  termsUrl: string;
  exampleUrl: string;
  parseReferralUrl(input: string): ParseResult;
};

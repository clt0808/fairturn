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
  /** url: paste a referral link. code: paste a referral code. */
  entry: "url" | "code";
  /** Short name used in the top bonus line, such as "EDF" or "Octopus". */
  bannerName: string;
  /** Compact bonus text, such as "£100 + £75" or "£50 each". */
  rewardText: string;
  /** Inclusive last day of a published offer, YYYY-MM-DD in Europe/London. Omitted when the provider publishes no end date. */
  endsOn?: string;
  referrerReward: string;
  newCustomerReward: string;
  /** Inclusive calendar dates, YYYY-MM-DD, in Europe/London. Empty when the provider does not publish a window. */
  offerStart: string;
  offerEnd: string;
  offerStartLabel: string;
  offerEndLabel: string;
  offerUrl: string;
  termsUrl: string;
  /** One line for the terms notice, before the terms link. */
  termsLine: string;
  /** One line on the provider card. */
  cardLine: string;
  exampleUrl: string;
  /** Where a code is typed, for code-based schemes. */
  signupUrl?: string;
  signupHint?: string;
  parseReferralUrl(input: string): ParseResult;
};

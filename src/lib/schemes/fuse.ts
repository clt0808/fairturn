import type { ParseResult, ReferralScheme } from "./types";

/**
 * Fuse’s referral article and terms describe a code typed at sign-up.
 * They do not publish the shape of a personal code. Promotional codes on
 * Fuse’s own pages are short uppercase words (POLITICS, WESERVED).
 * https://www.fuseenergy.com/blog/refer
 */
const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

export const FUSE_SIGNUP_URL = "https://www.fuseenergy.com/";

export function parseFuseReferralCode(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter your Fuse referral code." };
  if (/^https?:/i.test(trimmed) || trimmed.includes("://") || trimmed.includes("/")) {
    return { ok: false, error: "Fuse uses a code, not a web link. Enter the code from the Fuse app." };
  }
  const code = trimmed.replace(/[\s-]+/g, "").toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: "Use 4 to 16 letters or numbers, like the code in the Fuse app. No symbols.",
    };
  }
  return { ok: true, code, canonicalUrl: FUSE_SIGNUP_URL };
}

export const fuseScheme: ReferralScheme = {
  id: "fuse",
  supplierName: "Fuse Energy",
  schemeName: "Referral code",
  entry: "code",
  referrerReward: "£100",
  newCustomerReward: "£100",
  offerStart: "",
  offerEnd: "",
  offerStartLabel: "",
  offerEndLabel: "",
  offerUrl: "https://www.fuseenergy.com/blog/refer",
  termsUrl: "https://www.fuseenergy.com/legal/promotions-and-referrals-terms-and-conditions",
  termsLine: "Fuse pays £100 credit each after the referred customer pays their first bill.",
  cardLine: "£100 each, paid after the first bill.",
  exampleUrl: "POLITICS",
  signupUrl: FUSE_SIGNUP_URL,
  signupHint: "Enter the code near the end of sign-up, after you add the property, in the Fuse app or on fuseenergy.com.",
  parseReferralUrl: parseFuseReferralCode,
};

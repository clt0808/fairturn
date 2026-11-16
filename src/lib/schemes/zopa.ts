import { hostnameOf, readReferralUrl } from "./http-url";
import type { ParseResult, ReferralScheme } from "./types";

/** 20 hex characters, the length of the codes in Zopa’s own share text. */
const CODE_PATTERN = /^[a-f0-9]{20}$/;

/**
 * Zopa’s help page says the link is unique and comes from the app. It does not
 * print the address. The text the app gives people to share is
 * www.zopa.com/mgma?referralCode= plus 20 hexadecimal characters.
 */
export function parseZopaReferralUrl(input: string): ParseResult {
  const read = readReferralUrl(input, "Zopa referral link");
  if (!read.ok) return read;
  const url = read.url;
  const host = hostnameOf(url);
  if (host !== "www.zopa.com" && host !== "zopa.com") {
    return { ok: false, error: "The link must be on zopa.com." };
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 1 || parts[0].toLowerCase() !== "mgma") {
    return { ok: false, error: "Use the link from the Zopa app. It looks like https://www.zopa.com/mgma?referralCode=…" };
  }
  const params = [...url.searchParams.entries()];
  if (params.length !== 1 || params[0][0] !== "referralCode") {
    return { ok: false, error: "The link should contain only referralCode, with no extra tracking." };
  }
  const code = decodeURIComponent(params[0][1]).trim().toLowerCase();
  if (!CODE_PATTERN.test(code)) {
    return { ok: false, error: "That referral code is not the 20-character code from a Zopa share link." };
  }
  return { ok: true, code, canonicalUrl: `https://www.zopa.com/mgma?referralCode=${code}` };
}

export const zopaScheme: ReferralScheme = {
  id: "zopa",
  supplierName: "Zopa",
  schemeName: "Refer a Friend",
  entry: "url",
  bannerName: "Zopa",
  rewardText: "reward shown in app",
  referrerReward: "shown in the app",
  newCustomerReward: "shown in the app",
  offerStart: "",
  offerEnd: "",
  offerStartLabel: "",
  offerEndLabel: "",
  offerUrl: "https://www.zopa.com/help/article/how-does-the-referral-programme-work",
  termsUrl: "https://www.zopa.com/help/article/how-does-the-referral-programme-work",
  termsLine: "Zopa pays the Refer a Friend reward shown in the app into both Biscuit accounts within 30 days.",
  cardLine: "Biscuit account reward, amount shown in the app.",
  exampleUrl: "https://www.zopa.com/mgma?referralCode=0123456789abcdef0123",
  parseReferralUrl: parseZopaReferralUrl,
};

import { hostnameOf, readReferralUrl } from "./http-url";
import type { ParseResult, ReferralScheme } from "./types";

const CODE_PATTERN = /^[a-z]+-[a-z]+-[0-9]+$/;

/**
 * Octopus’s own help page says a referral link looks like
 * http://share.octopus.energy/adjective-noun-number.
 * https://octopus.energy/help-and-faqs/articles/i-have-a-question-about-octopus-pound50-referrals/
 */
export function parseOctopusReferralUrl(input: string): ParseResult {
  const read = readReferralUrl(input, "Octopus referral link");
  if (!read.ok) return read;
  const url = read.url;
  if (url.search) {
    return { ok: false, error: "Remove anything after the code, such as a question mark, then paste the link again." };
  }
  const host = hostnameOf(url);
  if (host !== "share.octopus.energy") {
    return { ok: false, error: "The link must be on share.octopus.energy." };
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) {
    return { ok: false, error: "Use the full link, like https://share.octopus.energy/bright-reef-240." };
  }
  const code = decodeURIComponent(parts[0]).toLowerCase();
  if (!CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: "That does not look like an Octopus referral code. Octopus’s own example is adjective-noun-number.",
    };
  }
  return { ok: true, code, canonicalUrl: `https://share.octopus.energy/${code}` };
}

export const octopusScheme: ReferralScheme = {
  id: "octopus",
  supplierName: "Octopus Energy",
  schemeName: "Refer a friend",
  entry: "url",
  bannerName: "Octopus",
  rewardText: "£50 each",
  referrerReward: "£50",
  newCustomerReward: "£50",
  offerStart: "",
  offerEnd: "",
  offerStartLabel: "",
  offerEndLabel: "",
  offerUrl: "https://octopus.energy/help-and-faqs/articles/i-have-a-question-about-octopus-pound50-referrals/",
  termsUrl: "https://octopus.energy/help-and-faqs/articles/i-have-a-question-about-octopus-pound50-referrals/",
  termsLine: "Octopus pays £50 credit each for a home referral, or £75 each for a business, after the first Direct Debit.",
  cardLine: "£50 each for a home referral.",
  exampleUrl: "https://share.octopus.energy/bright-reef-240",
  parseReferralUrl: parseOctopusReferralUrl,
};

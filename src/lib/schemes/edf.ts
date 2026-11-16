import type { OfferPhase, ParseResult, ReferralScheme } from "./types";

const CODE_PATTERN = /^[a-z]+-[a-z]+-[0-9]+$/;

/**
 * EDF describes its codes as adjective-noun-numbers, for example glassy-oak-677.
 * Anything else is rejected, including other suppliers and bare codes.
 */
export function parseEdfReferralUrl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste your EDF referral link." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: "That is not a full web address. Paste the link from your EDF account, not just the code.",
    };
  }

  if (url.username || url.password) {
    return { ok: false, error: "That link has a username in it. Paste the plain EDF referral link." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "The link must start with https://." };
  }

  if (url.port && url.port !== "443" && url.port !== "80") {
    return { ok: false, error: "That link points at an unusual port. Paste the plain EDF referral link." };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host !== "www.edfenergy.com" && host !== "edfenergy.com") {
    return { ok: false, error: "The link must be on edfenergy.com. Other suppliers are not in this queue." };
  }

  if (url.search) {
    return {
      ok: false,
      error: "Remove anything after the code, such as a question mark and tracking text, then paste the link again.",
    };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length !== 3 ||
    parts[0].toLowerCase() !== "quote" ||
    parts[1].toLowerCase() !== "refer-a-friend"
  ) {
    return {
      ok: false,
      error: "Use the full link, like https://www.edfenergy.com/quote/refer-a-friend/your-code.",
    };
  }

  const code = decodeURIComponent(parts[2]).toLowerCase();
  if (!CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: "That does not look like an EDF referral code. EDF’s own example is adjective-noun-number, such as glassy-oak-677.",
    };
  }

  return {
    ok: true,
    code,
    canonicalUrl: `https://www.edfenergy.com/quote/refer-a-friend/${code}`,
  };
}

export const edfScheme: ReferralScheme = {
  id: "edf",
  supplierName: "EDF",
  schemeName: "Refer a Friend",
  entry: "url",
  referrerReward: "£100",
  newCustomerReward: "£75",
  offerStart: "2026-11-16",
  offerEnd: "2027-01-05",
  offerStartLabel: "16 November 2026",
  offerEndLabel: "5 January 2027",
  offerUrl: "https://www.edfenergy.com/refer-a-friend",
  termsUrl: "https://www.edfenergy.com/sites/default/files/2024-09/H3267%20Refer-A-Friend%20AW1_1.pdf",
  termsLine: "EDF referral links are for friends and family. EDF may withhold the reward.",
  cardLine: "£100 for the referrer and £75 for the new customer, until 5 January 2027.",
  exampleUrl: "https://www.edfenergy.com/quote/refer-a-friend/glassy-oak-677",
  parseReferralUrl: parseEdfReferralUrl,
};

/** Calendar date in London, as YYYY-MM-DD, without shifting across midnight. */
export function londonDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function offerPhase(now = new Date()): OfferPhase {
  const day = londonDate(now);
  if (day < edfScheme.offerStart) return "upcoming";
  if (day > edfScheme.offerEnd) return "ended";
  return "live";
}

export function offerSentence(now = new Date()): string {
  const phase = offerPhase(now);
  if (phase === "ended") {
    return `EDF’s published end date for the ${edfScheme.referrerReward} / ${edfScheme.newCustomerReward} reward was ${edfScheme.offerEndLabel}. Check EDF’s site for the current amount before you switch.`;
  }
  if (phase === "upcoming") {
    return `EDF has published a Refer a Friend reward of ${edfScheme.referrerReward} for the referrer and ${edfScheme.newCustomerReward} for the new customer, from ${edfScheme.offerStartLabel}.`;
  }
  return `Until ${edfScheme.offerEndLabel}, EDF’s published Refer a Friend reward is ${edfScheme.referrerReward} for the referrer and ${edfScheme.newCustomerReward} for the new customer.`;
}

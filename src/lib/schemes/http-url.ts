import type { ParseResult } from "./types";

/** Shared checks for referral links: http(s), no userinfo, no odd port, no hash. */
export function readReferralUrl(input: string, label: string): { ok: true; url: URL } | ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: `Paste your ${label}.` };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: `That is not a full web address. Paste the ${label}, not just the code.` };
  }
  if (url.username || url.password) {
    return { ok: false, error: "That link has a username in it. Paste the plain referral link." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "The link must start with https://." };
  }
  if (url.port && url.port !== "443" && url.port !== "80") {
    return { ok: false, error: "That link points at an unusual port. Paste the plain referral link." };
  }
  if (url.hash) {
    return { ok: false, error: "Remove the # from the end of the link and paste it again." };
  }
  return { ok: true, url };
}

export function hostnameOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

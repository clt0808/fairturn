import { londonDate } from "./edf";
import { listSchemes } from "./index";
import type { ReferralScheme } from "./types";

/** "2027-01-05" → "5 Jan 2027". */
export function formatEndsOn(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Compact bonus line. The end date is omitted once that London day has passed, and when none was published. */
export function bonusLine(scheme: ReferralScheme, now = new Date()): string {
  const base = `${scheme.bannerName}: ${scheme.rewardText}`;
  if (!scheme.endsOn) return base;
  if (londonDate(now) > scheme.endsOn) return base;
  return `${base} · until ${formatEndsOn(scheme.endsOn)}`;
}

export function bonusLinesForPath(path: string, now = new Date()): { id: string; text: string }[] {
  const provider = path.match(/^\/p\/([^/]+)/)?.[1];
  return listSchemes()
    .filter((scheme) => !provider || scheme.id === provider)
    .map((scheme) => ({ id: scheme.id, text: bonusLine(scheme, now) }));
}

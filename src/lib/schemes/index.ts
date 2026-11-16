import { edfScheme } from "./edf";
import { fuseScheme } from "./fuse";
import { octopusScheme } from "./octopus";
import type { ReferralScheme } from "./types";
import { zopaScheme } from "./zopa";

const schemes: readonly ReferralScheme[] = [edfScheme, octopusScheme, zopaScheme, fuseScheme];

export function listSchemes(): readonly ReferralScheme[] {
  return schemes;
}

export function getScheme(id: string): ReferralScheme | undefined {
  return schemes.find((scheme) => scheme.id === id);
}

export function requireScheme(id: string): ReferralScheme {
  const scheme = getScheme(id);
  if (!scheme) throw new Error(`Unknown referral scheme: ${id}`);
  return scheme;
}

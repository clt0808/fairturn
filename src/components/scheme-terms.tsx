import type { ReferralScheme } from "@/lib/schemes/types";

export function SchemeTerms({ scheme }: { scheme: ReferralScheme }) {
  return (
    <p className="text-xs leading-5 text-ink/60">
      {scheme.termsLine}{" "}
      <a className="underline underline-offset-2" href={scheme.termsUrl}>
        {scheme.bannerName} terms
      </a>
    </p>
  );
}

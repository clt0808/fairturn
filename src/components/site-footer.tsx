import Link from "next/link";
import { SchemeTerms } from "@/components/scheme-terms";
import { listSchemes } from "@/lib/schemes";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-ink/70">
        <ul className="space-y-1 text-xs leading-5">
          {listSchemes().map((scheme) => (
            <li key={scheme.id}>
              <SchemeTerms scheme={scheme} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>FairTurn is independent. It does not pay the referral credit.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              Privacy
            </Link>
            <Link href="/faq" className="underline-offset-4 hover:underline">
              FAQ
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

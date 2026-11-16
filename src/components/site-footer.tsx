import Link from "next/link";
import { edfScheme } from "@/lib/schemes/edf";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between">
        <p>FairTurn is independent of {edfScheme.supplierName}. It does not pay the referral credit.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/faq" className="underline-offset-4 hover:underline">
            FAQ
          </Link>
          <a href={edfScheme.offerUrl} className="underline-offset-4 hover:underline" rel="noreferrer">
            EDF’s offer
          </a>
          <Link href="/admin" className="underline-offset-4 hover:underline">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

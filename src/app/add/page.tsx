import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AddLinkForm } from "@/app/add/add-link-form";
import { CLAIM_COOKIE } from "@/lib/admin/session";
import { formatClaimCode, normalizeClaimCode } from "@/lib/claims/code";
import { getDb } from "@/lib/db";
import { lookupTicket } from "@/lib/db/repository";

export const metadata: Metadata = { title: "Add my EDF referral link" };
export const dynamic = "force-dynamic";

export default async function AddPage() {
  const jar = await cookies();
  const normalized = normalizeClaimCode(jar.get(CLAIM_COOKIE)?.value ?? "");
  const ticket = normalized.length === 8 ? await lookupTicket(await getDb(), normalized) : null;
  const usable = Boolean(ticket && !ticket.consumed && !ticket.expired);

  let savedCodeNote: string | null = null;
  if (usable) {
    savedCodeNote = `We found claim code ${formatClaimCode(normalized)} in this browser, from a link you took earlier. It is filled in below. Clear it if you would rather join at the standard priority.`;
  } else if (ticket?.consumed) {
    savedCodeNote = "The claim code saved in this browser has already been used. This link will join at the standard priority unless you enter a different code.";
  } else if (ticket?.expired) {
    savedCodeNote = "The claim code saved in this browser has expired. This link will join at the standard priority unless you enter a different code.";
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">For EDF customers</p>
      <h1 className="mt-3 font-serif text-4xl">Add my link</h1>
      <p className="mt-4 max-w-prose leading-7 text-ink/80">
        Paste the referral link from your EDF account. It joins the back of its priority, then takes a turn whenever
        the rotation reaches it. Only EDF Refer a Friend links are accepted.
      </p>
      <div className="mt-8">
        <AddLinkForm initialClaimCode={usable ? formatClaimCode(normalized) : ""} savedCodeNote={savedCodeNote} />
      </div>
      <aside className="mt-8 max-w-prose rounded-lg border border-line bg-card px-5 py-4 text-sm leading-6 text-ink/80">
        <h2 className="font-semibold text-ink">Privacy, in short</h2>
        <p className="mt-2">
          We store this email and the link for as long as it stays in the queue. We do not use them for marketing, and
          we do not sell them. A hashed network address is kept for up to two days to limit repeat submissions.{" "}
          <Link href="/privacy" className="font-semibold text-pine underline-offset-4 hover:underline">
            Full privacy note
          </Link>
          .
        </p>
      </aside>
    </main>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GetLinkForm } from "@/app/get/get-link-form";
import { CLAIM_COOKIE } from "@/lib/admin/session";
import { formatClaimCode, normalizeClaimCode } from "@/lib/claims/code";
import { getDb } from "@/lib/db";
import { listLinks, lookupTicket } from "@/lib/db/repository";
import { edfScheme } from "@/lib/schemes/edf";

export const metadata: Metadata = { title: "Get an EDF referral link" };
export const dynamic = "force-dynamic";

export default async function GetPage() {
  const jar = await cookies();
  const normalized = normalizeClaimCode(jar.get(CLAIM_COOKIE)?.value ?? "");
  const db = await getDb();
  const found = normalized ? await lookupTicket(db, normalized) : null;
  const active = (await listLinks(db, edfScheme.id)).filter((link) => link.active).length;

  const initialTicket = found
    ? {
        url: found.url,
        referralCode: found.referralCode,
        claimCode: formatClaimCode(found.claimCode),
        demo: found.demo,
        consumed: found.consumed,
        expired: found.expired,
      }
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">For people switching</p>
      <h1 className="mt-3 font-serif text-4xl">Get an EDF referral link</h1>
      <p className="mt-4 max-w-prose leading-7 text-ink/80">
        You will be given the next link in the queue. It belongs to someone who added their own EDF Refer a Friend
        link. You do not need an account, and we do not ask for your email.
      </p>
      <div className="mt-8">
        <GetLinkForm initialTicket={initialTicket} queueEmpty={active === 0} />
      </div>
    </main>
  );
}

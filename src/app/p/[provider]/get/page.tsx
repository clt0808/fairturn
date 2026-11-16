import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { GetLinkForm } from "@/app/get/get-link-form";
import { SchemeTerms } from "@/components/scheme-terms";
import { CLAIM_COOKIE } from "@/lib/admin/session";
import { formatClaimCode, normalizeClaimCode } from "@/lib/claims/code";
import { getDb } from "@/lib/db";
import { listLinks, lookupTicket } from "@/lib/db/repository";
import { getScheme } from "@/lib/schemes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provider: string }>;
}): Promise<Metadata> {
  const scheme = getScheme((await params).provider);
  return { title: scheme ? `Get a ${scheme.supplierName} link` : "Get a link" };
}

export default async function GetProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const scheme = getScheme((await params).provider);
  if (!scheme) notFound();
  const jar = await cookies();
  const normalized = normalizeClaimCode(jar.get(CLAIM_COOKIE)?.value ?? "");
  const db = await getDb();
  const found = normalized ? await lookupTicket(db, normalized) : null;
  const sameProvider = found?.schemeId === scheme.id;
  const active = (await listLinks(db, scheme.id)).filter((link) => link.active).length;
  const initialTicket =
    found && sameProvider
      ? {
          url: found.url,
          referralCode: found.referralCode,
          claimCode: formatClaimCode(found.claimCode),
          demo: found.demo,
          consumed: found.consumed,
          expired: found.expired,
          entry: scheme.entry,
          supplierName: scheme.supplierName,
          signupUrl: scheme.signupUrl,
          signupHint: scheme.signupHint,
        }
      : null;

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <p className="text-sm text-ink/60">
        <Link href={`/p/${scheme.id}`} className="underline-offset-4 hover:underline">
          {scheme.supplierName}
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">Get a link</h1>
      <p className="mt-3 leading-7 text-ink/80">The next one in this provider’s queue.</p>
      <div className="mt-6">
        <GetLinkForm
          provider={scheme.id}
          addHref={`/p/${scheme.id}/add`}
          queueEmpty={active === 0}
          initialTicket={initialTicket}
        />
      </div>
      <div className="mt-4">
        <SchemeTerms scheme={scheme} />
      </div>
    </main>
  );
}

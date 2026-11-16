import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AddLinkForm } from "@/app/add/add-link-form";
import { CLAIM_COOKIE } from "@/lib/admin/session";
import { formatClaimCode, normalizeClaimCode } from "@/lib/claims/code";
import { getDb } from "@/lib/db";
import { lookupTicket } from "@/lib/db/repository";
import { getScheme } from "@/lib/schemes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provider: string }>;
}): Promise<Metadata> {
  const scheme = getScheme((await params).provider);
  return { title: scheme ? `Add a ${scheme.supplierName} link` : "Add a link" };
}

export default async function AddProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const scheme = getScheme((await params).provider);
  if (!scheme) notFound();
  const jar = await cookies();
  const normalized = normalizeClaimCode(jar.get(CLAIM_COOKIE)?.value ?? "");
  const ticket = normalized.length === 8 ? await lookupTicket(await getDb(), normalized) : null;
  const usable = Boolean(ticket && ticket.schemeId === scheme.id && !ticket.consumed && !ticket.expired);

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <p className="text-sm text-ink/60">
        <Link href={`/p/${scheme.id}`} className="underline-offset-4 hover:underline">
          {scheme.supplierName}
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">Add my link</h1>
      <p className="mt-3 leading-7 text-ink/80">One active link per email in this queue.</p>
      <div className="mt-6">
        <AddLinkForm
          provider={scheme.id}
          entry={scheme.entry}
          example={scheme.exampleUrl}
          supplierName={scheme.supplierName}
          getHref={`/p/${scheme.id}/get`}
          initialClaimCode={usable ? formatClaimCode(normalized) : ""}
        />
      </div>
    </main>
  );
}

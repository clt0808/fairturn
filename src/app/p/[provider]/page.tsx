import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SchemeTerms } from "@/components/scheme-terms";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { getQueueSettings, listLinks } from "@/lib/db/repository";
import { ownerShareCopy } from "@/lib/queue";
import { getScheme } from "@/lib/schemes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provider: string }>;
}): Promise<Metadata> {
  const scheme = getScheme((await params).provider);
  return { title: scheme ? scheme.supplierName : "Provider" };
}

export default async function ProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const scheme = getScheme((await params).provider);
  if (!scheme) notFound();
  const db = await getDb();
  const links = await listLinks(db, scheme.id);
  const settings = await getQueueSettings(db, scheme.id);
  const note = ownerShareCopy(
    settings.ownerEvery,
    links.some((link) => link.owner && link.active),
  );

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <p className="text-sm text-ink/60">
        <Link href="/" className="underline-offset-4 hover:underline">
          All providers
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl">{scheme.supplierName}</h1>
      <p className="mt-3 text-lg leading-7 text-ink/80">{scheme.cardLine}</p>
      {note ? <p className="mt-3 text-sm leading-6 text-ink/70">{note}</p> : null}
      <div className="mt-8 grid gap-3">
        <Button asChild size="lg" className="w-full">
          <Link href={`/p/${scheme.id}/get`}>Get a link</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={`/p/${scheme.id}/add`}>Add my link</Link>
        </Button>
      </div>
      <div className="mt-4">
        <SchemeTerms scheme={scheme} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listSchemes } from "@/lib/schemes";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl leading-tight text-ink">Take a turn. Give a turn.</h1>
      <p className="mt-3 max-w-prose text-lg leading-7 text-ink/80">
        A fair queue for referral links. Each provider has its own rotation.
      </p>
      <ul className="mt-8 space-y-4">
        {listSchemes().map((scheme) => (
          <li key={scheme.id}>
            <Card className="px-5 py-5">
              <h2 className="font-serif text-2xl">{scheme.supplierName}</h2>
              <p className="mt-1 text-sm leading-6 text-ink/70">{scheme.cardLine}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg" className="w-full">
                  <Link href={`/p/${scheme.id}/get`}>Get a link</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href={`/p/${scheme.id}/add`}>Add my link</Link>
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}

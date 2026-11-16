import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-serif text-3xl">That page is not here</h1>
      <p className="mt-3 text-ink/80">The queue is on the home page, along with getting a link and adding one.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to FairTurn</Link>
      </Button>
    </main>
  );
}

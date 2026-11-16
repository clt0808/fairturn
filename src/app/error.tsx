"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-prose leading-7 text-ink/80">
        The queue could not be loaded. Try again in a moment. If you were submitting a link, check whether it
        appeared before sending it a second time.
      </p>
      <Button type="button" className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}

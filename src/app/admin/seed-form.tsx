"use client";

import { useActionState } from "react";
import { seedLinkAction, type SeedState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { edfScheme } from "@/lib/schemes/edf";

const initial: SeedState = {};

export function SeedForm() {
  const [state, action, pending] = useActionState(seedLinkAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="seed-email">Email</Label>
          <Input id="seed-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seed-url">EDF referral link</Label>
          <Input id="seed-url" name="url" type="url" required placeholder={edfScheme.exampleUrl} spellCheck={false} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="boosted" className="size-4 accent-pine" />
        Start with boosted priority
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[#8d2f2f]">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-pine">Added to the queue.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add to queue"}
      </Button>
    </form>
  );
}

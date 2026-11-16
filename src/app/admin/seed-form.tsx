"use client";

import { useActionState } from "react";
import { seedLinkAction, type SeedState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferralScheme } from "@/lib/schemes/types";

const initial: SeedState = {};

export function SeedForm({
  provider,
  entry,
  example,
}: {
  provider: string;
  entry: ReferralScheme["entry"];
  example: string;
}) {
  const [state, action, pending] = useActionState(seedLinkAction, initial);
  const codeEntry = entry === "code";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="provider" value={provider} />
      {state.error ? <p className="text-sm text-[#8d2f2f]">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-pine">Added.</p> : null}
      <div className="space-y-2">
        <Label htmlFor="seed-email">Email</Label>
        <Input id="seed-email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="seed-value">{codeEntry ? "Referral code" : "Referral link"}</Label>
        <Input
          id="seed-value"
          name={codeEntry ? "code" : "url"}
          type={codeEntry ? "text" : "url"}
          required
          placeholder={example}
          spellCheck={false}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="boosted" type="checkbox" />
        Start with boosted priority
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add to queue"}
      </Button>
    </form>
  );
}

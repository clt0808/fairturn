"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitLinkAction, type SubmitState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferralScheme } from "@/lib/schemes/types";

const initial: SubmitState = { status: "idle" };

export function AddLinkForm({
  provider,
  entry,
  example,
  supplierName,
  getHref,
  initialClaimCode,
}: {
  provider: string;
  entry: ReferralScheme["entry"];
  example: string;
  supplierName: string;
  getHref: string;
  initialClaimCode: string;
}) {
  const [state, action, pending] = useActionState(submitLinkAction, initial);
  const codeEntry = entry === "code";

  if (state.status === "ok") {
    return (
      <Card className="px-5 py-6">
        <h2 className="font-serif text-2xl">You’re in the queue</h2>
        <p className="mt-3 leading-7 text-ink/80">
          {state.boosted ? "Boosted priority." : "Standard place."} Stored against {state.email}. {state.queueSize}{" "}
          {state.queueSize === 1 ? "link" : "links"} in this queue.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href={getHref}>Get a link</Link>
        </Button>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="provider" value={provider} />
      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-[#e7c8c8] bg-[#f8ecec] px-3 py-2 text-sm text-[#8d2f2f]">
          {state.message}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={codeEntry ? "code" : "url"}>{codeEntry ? `${supplierName} referral code` : "Referral link"}</Label>
        <Input
          id={codeEntry ? "code" : "url"}
          name={codeEntry ? "code" : "url"}
          type={codeEntry ? "text" : "url"}
          required
          placeholder={example}
          spellCheck={false}
          autoCapitalize={codeEntry ? "characters" : "off"}
        />
        <p className="text-sm text-ink/70">Like {example}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="claim">Claim code, if you have one</Label>
        <Input
          id="claim"
          name="claim"
          defaultValue={initialClaimCode}
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD-2345"
          maxLength={12}
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add my link"}
      </Button>
    </form>
  );
}

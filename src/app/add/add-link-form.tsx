"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitLinkAction, type SubmitState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { edfScheme } from "@/lib/schemes/edf";

const initial: SubmitState = { status: "idle" };

export function AddLinkForm({
  initialClaimCode,
  savedCodeNote,
}: {
  initialClaimCode: string;
  savedCodeNote: string | null;
}) {
  const [state, action, pending] = useActionState(submitLinkAction, initial);

  if (state.status === "ok") {
    return (
      <Card className="px-5 py-6">
        <h2 className="font-serif text-2xl">You’re in the queue</h2>
        <p className="mt-3 leading-7 text-ink/80">
          {state.boosted
            ? "Your link has boosted priority. Over time it should be handed out about twice as often as a standard link. It still shares the queue with everyone else."
            : "Your link has a standard place. It will be handed out in turn with the other standard links."}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Stored against {state.email}. There {state.queueSize === 1 ? "is" : "are"} now {state.queueSize}{" "}
          {state.queueSize === 1 ? "link" : "links"} in the queue. The admin can remove yours if you ask, matched to
          this email.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/get">See how a visitor gets a link</Link>
        </Button>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {savedCodeNote ? (
        <p className="rounded-md border border-line bg-moss px-3 py-2 text-sm leading-6 text-pine-deep">{savedCodeNote}</p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-[#e7c8c8] bg-[#f8ecec] px-3 py-2 text-sm text-[#8d2f2f]">
          {state.message}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        <p className="text-sm text-ink/70">Used only to keep one link per person, and so the admin can remove it.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">EDF referral link</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          inputMode="url"
          placeholder={edfScheme.exampleUrl}
          spellCheck={false}
        />
        <p className="text-sm text-ink/70">
          From your EDF account. It should look like {edfScheme.exampleUrl}.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="claim">Claim code, if you have one</Label>
        <Input
          id="claim"
          name="claim"
          defaultValue={initialClaimCode}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ABCD-2345"
          maxLength={12}
        />
        <p className="text-sm text-ink/70">
          Optional. This is the code shown when you took a link from this site. Leave it blank to join at the standard
          priority. A boost cannot be stacked.
        </p>
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding your link…" : "Add my link"}
      </Button>
    </form>
  );
}

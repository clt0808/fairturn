"use client";

import Link from "next/link";
import { useActionState } from "react";
import { handOutLinkAction, type HandoutState, type PublicTicket } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const initial: HandoutState = { status: "idle" };

function Ticket({ ticket }: { ticket: PublicTicket }) {
  const codeScheme = ticket.entry === "code";
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Your turn</p>
        {codeScheme ? (
          <>
            <p className="mt-3 font-mono text-3xl tracking-[0.12em] text-ink">{ticket.referralCode}</p>
            <div className="mt-4">
              <CopyButton value={ticket.referralCode} label="Copy code" />
            </div>
            {ticket.signupHint ? <p className="mt-3 text-sm leading-6 text-ink/80">{ticket.signupHint}</p> : null}
            {ticket.signupUrl ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={ticket.signupUrl} target="_blank" rel="noreferrer">
                  Open {ticket.supplierName} sign-up
                </a>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-3 break-all font-serif text-xl leading-snug">{ticket.url}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value={ticket.url} label="Copy link" />
              <Button asChild variant="outline" size="sm">
                <a href={ticket.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="border-t border-dashed border-line bg-moss/60 px-5 py-4">
        <p className="text-sm font-semibold text-pine-deep">Claim code {ticket.claimCode}</p>
        <p className="mt-2 text-sm leading-6 text-ink/80">
          {ticket.consumed
            ? "Already used."
            : ticket.expired
              ? "Expired."
              : "If you join and later add your own, this code gives you a higher share. It is saved in this browser."}
        </p>
        {ticket.demo ? <p className="mt-2 text-sm font-semibold text-copper">Sample data. Do not use it.</p> : null}
      </div>
    </Card>
  );
}

export function GetLinkForm({
  provider,
  addHref,
  queueEmpty,
  initialTicket,
}: {
  provider: string;
  addHref: string;
  queueEmpty: boolean;
  initialTicket: PublicTicket | null;
}) {
  const [state, action, pending] = useActionState(handOutLinkAction, initial);
  const ticket = state.status === "ok" ? state.ticket : initialTicket;

  return (
    <div className="space-y-6">
      {ticket ? <Ticket ticket={ticket} /> : null}
      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-[#e7c8c8] bg-[#f8ecec] px-3 py-2 text-sm text-[#8d2f2f]">
          {state.message}
        </p>
      ) : null}
      {queueEmpty && !ticket ? (
        <Card className="px-5 py-6">
          <h2 className="font-serif text-2xl">The queue is empty</h2>
          <Button asChild className="mt-4 w-full sm:w-auto">
            <Link href={addHref}>Add my link</Link>
          </Button>
        </Card>
      ) : (
        <form action={action}>
          <input type="hidden" name="provider" value={provider} />
          <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Finding the next one…" : ticket ? "Take another turn" : "Show me the next one"}
          </Button>
        </form>
      )}
    </div>
  );
}

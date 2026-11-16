"use client";

import Link from "next/link";
import { useActionState } from "react";
import { handOutLinkAction, type HandoutState, type PublicTicket } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { offerSentence } from "@/lib/schemes/edf";

const initial: HandoutState = { status: "idle" };

function Ticket({ ticket }: { ticket: PublicTicket }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-dashed border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Your link for this turn</p>
        <p className="mt-3 break-all font-serif text-xl leading-snug">{ticket.url}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton value={ticket.url} label="Copy link" />
          <Button asChild variant="outline" size="sm">
            <a href={ticket.url} target="_blank" rel="noreferrer">
              Open on EDF
            </a>
          </Button>
        </div>
      </div>
      <div className="bg-moss/60 px-5 py-4">
        <p className="text-sm font-semibold text-pine-deep">Keep this claim code</p>
        <p className="mt-2 font-mono text-2xl tracking-[0.18em] text-ink">{ticket.claimCode}</p>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/80">
          {ticket.consumed
            ? "This code has already been used to boost a link."
            : ticket.expired
              ? "This code has expired, so it can no longer boost a link."
              : "If you join EDF with the link above and later add your own referral link here, enter this code. It gives your link a higher share of future turns. We have also saved it in this browser."}
        </p>
        {ticket.demo ? (
          <p className="mt-3 text-sm font-semibold text-copper">
            This is sample data, not a real customer’s link. Do not switch with it.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function GetLinkForm({
  initialTicket,
  queueEmpty,
}: {
  initialTicket: PublicTicket | null;
  queueEmpty: boolean;
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
      {queueEmpty ? (
        <Card className="px-5 py-6">
          <h2 className="font-serif text-2xl">The queue is empty</h2>
          <p className="mt-2 text-ink/80">
            Nobody has added an EDF link yet. If you already have one, you can go first.
          </p>
          <Button asChild className="mt-4">
            <Link href="/add">Add my link</Link>
          </Button>
        </Card>
      ) : (
        <form action={action} className="space-y-3">
          <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Finding the next link…" : ticket ? "Take another turn" : "Show me a link"}
          </Button>
          {ticket ? (
            <p className="max-w-prose text-sm text-ink/70">
              Asking again moves the queue on and uses another person’s turn. Only do that if you have not used the
              link above.
            </p>
          ) : (
            <p className="max-w-prose text-sm text-ink/70">{offerSentence()} Compare the tariff before you switch.</p>
          )}
        </form>
      )}
    </div>
  );
}

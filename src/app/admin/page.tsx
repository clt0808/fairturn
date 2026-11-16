import type { Metadata } from "next";
import { cookies } from "next/headers";
import { logoutAction, moveLinkAction, removeLinkAction, restoreLinkAction } from "@/app/actions";
import { LoginForm } from "@/app/admin/login-form";
import { SeedForm } from "@/app/admin/seed-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_COOKIE, adminConfigured, readAdminSession } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { listLinks, type LinkRow } from "@/lib/db/repository";
import { formatWhen } from "@/lib/format";
import { isBoostedWeight, rankForNextPick, type QueueMember } from "@/lib/queue";
import { edfScheme } from "@/lib/schemes/edf";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  "email-taken": "That link was not restored. The email already has an active link.",
  "code-taken": "That link was not restored. That referral link is already active.",
  missing: "That link could not be found.",
};

function toMember(link: LinkRow): QueueMember {
  return {
    id: link.id,
    weight: link.weight,
    currentWeight: link.currentWeight,
    handouts: link.handouts,
    createdAt: link.createdAt,
    active: link.active,
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-serif text-4xl">Admin is not configured</h1>
        <p className="mt-4 max-w-prose leading-7 text-ink/80">
          Set the <span className="font-mono text-sm">ADMIN_PASSWORD</span> environment variable and restart the app.
          The password is not stored in the database.
        </p>
      </main>
    );
  }

  const jar = await cookies();
  if (!readAdminSession(jar.get(ADMIN_COOKIE)?.value)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-serif text-4xl">Queue admin</h1>
        <p className="mt-3 mb-8 text-ink/80">Enter the password from the server environment.</p>
        <LoginForm />
      </main>
    );
  }

  const params = await searchParams;
  const notice = params.notice ? notices[params.notice] : undefined;
  const links = listLinks(getDb(), edfScheme.id);
  const active = links.filter((link) => link.active);
  const removed = links.filter((link) => !link.active);
  const ranked = rankForNextPick(active.map(toMember));
  const rankOf = new Map(ranked.map((member, index) => [member.id, index + 1]));
  const ordered = [...active].sort((a, b) => (rankOf.get(a.id) ?? 99) - (rankOf.get(b.id) ?? 99));
  const handouts = links.reduce((sum, link) => sum + link.handouts, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl">Queue admin</h1>
          <p className="mt-2 text-ink/70">
            {active.length} active · {handouts} {handouts === 1 ? "handout" : "handouts"} ·{" "}
            {active.filter((link) => isBoostedWeight(link.weight)).length} boosted
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </div>

      {notice ? (
        <p role="status" className="mt-6 rounded-md border border-[#e7c8c8] bg-[#f8ecec] px-3 py-2 text-sm text-[#8d2f2f]">
          {notice}
        </p>
      ) : null}

      <Card className="mt-8 px-5 py-5">
        <h2 className="font-serif text-2xl">Add a link</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/70">
          Use this to seed your own EDF link, or to fix the queue. It skips the public rate limit and does not need a
          claim code. The same checks on the link shape, one email, and duplicate links still apply.
        </p>
        <div className="mt-4">
          <SeedForm />
        </div>
      </Card>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Active links</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/70">
          Up and down change who is offered next. They do not change a link’s weight. The next handout follows the
          order below.
        </p>
        {ordered.length === 0 ? (
          <p className="mt-4 text-ink/70">No active links.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {ordered.map((link) => (
              <li key={link.id}>
                <Card className="px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                        Next {rankOf.get(link.id)} · {isBoostedWeight(link.weight) ? "Boosted" : "Standard"} ·{" "}
                        {link.handouts} {link.handouts === 1 ? "handout" : "handouts"}
                      </p>
                      <p className="mt-1 break-all font-medium">{link.url}</p>
                      <p className="mt-1 text-sm text-ink/70">
                        {link.email} · added {formatWhen(link.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={moveLinkAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button type="submit" variant="outline" size="sm">
                          Move up
                        </Button>
                      </form>
                      <form action={moveLinkAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button type="submit" variant="outline" size="sm">
                          Move down
                        </Button>
                      </form>
                      <form action={removeLinkAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <Button type="submit" variant="danger" size="sm">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="mt-10">
        <summary className="cursor-pointer font-serif text-2xl">Removed ({removed.length})</summary>
        {removed.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Nothing removed.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {removed.map((link) => (
              <li key={link.id} className="rounded-lg border border-line bg-card px-4 py-4">
                <p className="break-all">{link.url}</p>
                <p className="mt-1 text-sm text-ink/70">
                  {link.email} · {link.handouts} {link.handouts === 1 ? "handout" : "handouts"}
                </p>
                <form action={restoreLinkAction} className="mt-3">
                  <input type="hidden" name="id" value={link.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Restore
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </details>
    </main>
  );
}

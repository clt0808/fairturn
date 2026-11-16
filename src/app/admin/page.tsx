import type { Metadata } from "next";
import { cookies } from "next/headers";
import { logoutAction, moveLinkAction, removeLinkAction, restoreLinkAction, setOwnerLinkAction } from "@/app/actions";
import { LoginForm } from "@/app/admin/login-form";
import { OwnerSettingsForm } from "@/app/admin/owner-settings-form";
import { SeedForm } from "@/app/admin/seed-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_COOKIE, adminConfigured, readAdminSession } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { getQueueSettings, listLinks, type LinkRow } from "@/lib/db/repository";
import { formatWhen } from "@/lib/format";
import { isBoostedWeight, ordinalWord, rankForNextPick, type QueueMember } from "@/lib/queue";
import { getScheme, listSchemes, requireScheme } from "@/lib/schemes";

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
    owner: link.owner,
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; provider?: string }>;
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
  const scheme = getScheme(params.provider ?? "") ?? requireScheme("edf");
  const notice = params.notice ? notices[params.notice] : undefined;
  const db = await getDb();
  const links = await listLinks(db, scheme.id);
  const settings = await getQueueSettings(db, scheme.id);
  const ownerShareOn = settings.ownerEvery !== null;
  const active = links.filter((link) => link.active);
  const removed = links.filter((link) => !link.active);
  const ownerLink = links.find((link) => link.owner) ?? null;
  const fairLinks = active.filter((link) => !(ownerShareOn && link.owner));
  const ranked = rankForNextPick(fairLinks.map(toMember));
  const rankOf = new Map(ranked.map((member, index) => [member.id, index + 1]));
  const ordered = [...fairLinks].sort((a, b) => (rankOf.get(a.id) ?? 99) - (rankOf.get(b.id) ?? 99));
  const handouts = links.reduce((sum, link) => sum + link.handouts, 0);
  const intervalLabel = settings.ownerEvery ? `every ${ordinalWord(settings.ownerEvery)} turn` : "off";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl">{scheme.supplierName}</h1>
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

      <nav aria-label="Provider" className="mt-6 flex flex-wrap gap-2">
        {listSchemes().map((item) => (
          <Button key={item.id} asChild variant={item.id === scheme.id ? "default" : "outline"} size="sm">
            <a href={`/admin?provider=${item.id}`}>{item.supplierName}</a>
          </Button>
        ))}
      </nav>

      {notice ? (
        <p role="status" className="mt-6 rounded-md border border-[#e7c8c8] bg-[#f8ecec] px-3 py-2 text-sm text-[#8d2f2f]">
          {notice}
        </p>
      ) : null}

      <Card className="mt-8 px-5 py-5">
        <h2 className="font-serif text-2xl">Add a link</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/70">
          Adds a link to this provider’s queue. It skips the public rate limit.
        </p>
        <div className="mt-4">
          <SeedForm provider={scheme.id} entry={scheme.entry} example={scheme.exampleUrl} />
        </div>
      </Card>

      <Card className="mt-8 border-copper px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">Owner link</p>
        <h2 className="mt-1 font-serif text-2xl">
          {ownerLink ? ownerLink.email : "No owner link yet"}
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/70">
          {ownerShareOn
            ? `This link is handed out ${intervalLabel}. Those turns are kept out of the fair rotation, so they do not change anyone else’s score. Only one link can be the owner link.`
            : "The owner share is off, so this link takes a normal turn with everyone else. Set the interval to 3 to hand it out on turns 3, 6, 9, and so on."}
        </p>
        {ownerLink ? (
          <div className="mt-4">
            <p className="break-all font-medium">{ownerLink.url}</p>
            <p className="mt-1 text-sm text-ink/70">
              {ownerLink.active ? "Active" : "Removed, so the reserved turns are paused"} · {ownerLink.handouts}{" "}
              {ownerLink.handouts === 1 ? "handout" : "handouts"}
              {isBoostedWeight(ownerLink.weight) ? " · Boosted weight, used only when the share is off" : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setOwnerLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                <input type="hidden" name="id" value="" />
                <Button type="submit" variant="outline" size="sm">
                  Clear owner
                </Button>
              </form>
              {ownerLink.active ? (
                <form action={removeLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                  <input type="hidden" name="id" value={ownerLink.id} />
                  <Button type="submit" variant="danger" size="sm">
                    Remove
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/70">Choose “Make owner link” on one row below.</p>
        )}
        <div className="mt-5">
          <OwnerSettingsForm ownerEvery={settings.ownerEvery} provider={scheme.id} />
        </div>
      </Card>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Fair rotation</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-ink/70">
          {ownerShareOn
            ? "Up and down change who is offered on the turns that are not reserved for the owner. They do not change a link’s weight."
            : "Up and down change who is offered next. They do not change a link’s weight. The next handout follows the order below."}
        </p>
        {ordered.length === 0 ? (
          <p className="mt-4 text-ink/70">No other links are in the fair rotation.</p>
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
                      <form action={moveLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button type="submit" variant="outline" size="sm">
                          Move up
                        </Button>
                      </form>
                      <form action={moveLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button type="submit" variant="outline" size="sm">
                          Move down
                        </Button>
                      </form>
                      <form action={removeLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                        <input type="hidden" name="id" value={link.id} />
                        <Button type="submit" variant="danger" size="sm">
                          Remove
                        </Button>
                      </form>
                      {link.owner ? (
                        <form action={setOwnerLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                          <input type="hidden" name="id" value="" />
                          <Button type="submit" variant="outline" size="sm">
                            Clear owner
                          </Button>
                        </form>
                      ) : (
                        <form action={setOwnerLinkAction}><input type="hidden" name="provider" value={scheme.id} />
                          <input type="hidden" name="id" value={link.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Make owner link
                          </Button>
                        </form>
                      )}
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
                  {link.email}
                  {link.owner ? " · Owner link" : ""} · {link.handouts}{" "}
                  {link.handouts === 1 ? "handout" : "handouts"}
                </p>
                <form action={restoreLinkAction} className="mt-3"><input type="hidden" name="provider" value={scheme.id} />
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

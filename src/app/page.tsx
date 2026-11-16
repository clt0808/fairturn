import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { countHandouts, getQueueSettings, listLinks } from "@/lib/db/repository";
import { isBoostedWeight, ownerShareCopy, previewHandouts, type QueueMember } from "@/lib/queue";
import { edfScheme, offerPhase, offerSentence } from "@/lib/schemes/edf";

export const dynamic = "force-dynamic";

function toMember(link: {
  id: string;
  weight: number;
  currentWeight: number;
  handouts: number;
  createdAt: number;
  active: boolean;
  owner: boolean;
}): QueueMember {
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

function turnLabel(member: QueueMember | undefined, ownerShareOn: boolean): { text: string; className: string } {
  if (member?.owner && ownerShareOn) return { text: "Owner link", className: "text-sm font-semibold text-copper" };
  if (member && isBoostedWeight(member.weight)) {
    return { text: "Boosted link", className: "text-sm font-semibold text-copper" };
  }
  return { text: "Standard link", className: "text-sm text-ink" };
}

export default function HomePage() {
  const db = getDb();
  const links = listLinks(db, edfScheme.id).filter((link) => link.active);
  const settings = getQueueSettings(db, edfScheme.id);
  const ownerShareOn = settings.ownerEvery !== null && links.some((link) => link.owner);
  const members = links.map(toMember);
  const handoutsSoFar = countHandouts(db, edfScheme.id);
  const upcoming = previewHandouts(members, 4, {
    handoutsSoFar,
    ownerEvery: ownerShareOn ? settings.ownerEvery : null,
  }).map((id) => members.find((member) => member.id === id));
  const boosted = links.filter((link) => isBoostedWeight(link.weight) && !(ownerShareOn && link.owner)).length;
  const phase = offerPhase();
  const shareCopy = ownerShareCopy(settings.ownerEvery, links.some((link) => link.owner));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">EDF Refer a Friend</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Take a turn. Give a turn.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-ink/80">
            A fair queue for EDF referral links. Visitors who want to switch are given the next link in the rotation,
            so one link cannot take every click.
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink/80">{offerSentence()}</p>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink/80">{shareCopy}</p>
          {phase === "live" ? (
            <p className="mt-2 text-sm text-ink/60">
              EDF pays that credit, on EDF’s terms, after a successful switch. This site only chooses whose link is
              shown.
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/get">Get a referral link</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/add">Add my link</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-dashed border-line px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Next turns</p>
            <p className="mt-1 text-sm text-ink/70">
              {links.length === 0
                ? "No links yet."
                : `${links.length} ${links.length === 1 ? "link" : "links"} in the queue${boosted ? `, ${boosted} boosted` : ""}.`}
            </p>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 py-6 text-sm leading-6 text-ink/80">
              The rotation starts when the first person adds the link from their EDF account.
            </p>
          ) : (
            <ol className="divide-y divide-line">
              {upcoming.map((member, index) => {
                const label = turnLabel(member, ownerShareOn);
                return (
                  <li key={`${member?.id ?? "empty"}-${index}`} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-ink/60">Turn {handoutsSoFar + index + 1}</span>
                    <span className={label.className}>{label.text}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="border-t border-line px-5 py-3 text-xs leading-5 text-ink/60">
            A boosted link can appear more than once in a short stretch. Across the whole queue it is offered about
            twice as often as a standard one.
            {ownerShareOn ? " One turn in this list is the site owner’s link." : ""}
          </p>
        </Card>
      </div>

      <section id="how" className="mt-16 scroll-mt-6">
        <h2 className="font-serif text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Add your link",
              body: "Paste the referral link from your EDF account, and the email you want it stored against. One link per email.",
            },
            {
              title: "Visitors take a turn",
              body: "Someone who wants a quote asks for a link. We hand out whoever is next, then move them to the back of their share.",
            },
            {
              title: "Come back with a code",
              body: "If you joined using a link from this site, you were given a claim code. Add your own link with that code and it is boosted.",
            },
          ].map((step, index) => (
            <li key={step.title} className="rounded-lg border border-line bg-card px-5 py-5">
              <p className="font-serif text-2xl text-copper">{index + 1}</p>
              <h3 className="mt-2 font-serif text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/80">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-prose text-base leading-7 text-ink/80">{shareCopy}</p>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl">What “fair” means here</h2>
          <div className="mt-4 space-y-3 text-base leading-7 text-ink/80">
            <p>
              Each standard link has a weight of 1. A boosted link has a weight of 2. Every time someone asks for a
              link, the queue offers the member who is most behind on their share. Ties go to whoever joined earlier.
            </p>
            <p>
              With one boosted link and two standard links, eight handouts are split 4, 2 and 2. Nobody is pinned to
              the top. A boost does not stack, and joining does not wipe the turns already owed to other people.
            </p>
            <p>
              The boost is an honour system. The claim code shows that this site handed a link to that browser. It
              does not prove EDF completed a switch, because we never see EDF’s records.
            </p>
          </div>
        </div>
        <Card className="px-5 py-5">
          <h2 className="font-serif text-2xl">What we ask for</h2>
          <p className="mt-3 text-sm leading-6 text-ink/80">
            Visitors who take a link are not asked for a name, email, or address. People who add a link give an email,
            so we can keep the queue to one link each and remove it later. We also keep a hash of the network address
            for a short time, to slow down repeat submissions.
          </p>
          <Link href="/privacy" className="mt-4 inline-block text-sm font-semibold text-pine underline-offset-4 hover:underline">
            Read the privacy note
          </Link>
        </Card>
      </section>
    </main>
  );
}

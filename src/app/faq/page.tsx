import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getQueueSettings, listLinks } from "@/lib/db/repository";
import { ownerShareCopy } from "@/lib/queue";
import { edfScheme, offerSentence } from "@/lib/schemes/edf";

export const metadata: Metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

async function questions(): Promise<{ q: string; a: string }[]> {
  const db = await getDb();
  const settings = await getQueueSettings(db, edfScheme.id);
  const hasOwner = (await listLinks(db, edfScheme.id)).some((link) => link.owner && link.active);
  return [
  {
    q: "Is FairTurn part of EDF?",
    a: "No. Quotes and switches happen on edfenergy.com. FairTurn only rotates links that members paste in. Check the tariff yourself before you switch.",
  },
  {
    q: "What does the link look like?",
    a: `An EDF referral link looks like ${edfScheme.exampleUrl}. Residential customers can copy it from MyAccount. Small business customers can ask EDF for theirs. Bare codes, and links from other suppliers, are rejected.`,
  },
  {
    q: "How does the rotation work?",
    a: "Each standard link has weight 1 and each boosted link has weight 2. The next visitor is offered the link that is furthest behind its share. When weights are equal, the older link wins a tie. Over a full cycle a boosted link is handed out about twice as often as a standard one, and equal links get equal turns.",
  },
  {
    q: "Why does the owner’s link appear on a fixed turn?",
    a: `${ownerShareCopy(settings.ownerEvery, hasOwner)} Only one link can be the owner link. It is chosen on the admin page.`,
  },
  {
    q: "How do I get the boost?",
    a: "Take a link from this site, join EDF with it, then come back and add your own link. Enter the claim code you were shown — it is also saved in that browser. The code works once, lasts 120 days, and cannot boost the same link it was issued for. A boost cannot be stacked, and one network can only boost two links a day. We cannot check EDF’s records, so this is an honour system.",
  },
  {
    q: "Will the credit definitely be paid?",
    a: `${offerSentence()} EDF decides whether a referral qualifies. The credit is not cash. EDF usually applies it after the new customer has switched and both people have made a payment. EDF can refuse a reward it believes breaks its terms, including where it suspects a link was shared with strangers or used commercially.`,
  },
  {
    q: "What if I take a link and do not switch?",
    a: "Nothing else happens. You can ignore the claim code. Please do not add a link unless you are an EDF customer with a real referral link of your own.",
  },
  {
    q: "Can I add more than one link?",
    a: "No. One active link per email, and the same referral link cannot be in the queue twice. Repeat submissions from one network are rate limited.",
  },
  {
    q: "How do I remove my link?",
    a: "There is no public delete button, so we do not need extra identity checks. The person who runs the queue can remove a link from the admin page, matched to the email you used.",
  },
  {
    q: "What personal data do you keep?",
    a: "The email and referral link of people who join the queue, claim codes, handout counts, and a hash of the network address for abuse limits. No name, home address, meter, or payment details. See the privacy note.",
  },
];
}

export default async function FaqPage() {
  const items = await questions();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-4xl">Questions</h1>
      <p className="mt-4 max-w-prose leading-7 text-ink/80">
        Short answers. The notice at the top of every page is the part to read before you use or share a link.
      </p>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="cursor-pointer list-none font-serif text-xl [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-copper group-open:hidden">+</span>
              <span className="mr-2 hidden text-copper group-open:inline">–</span>
              {item.q}
            </summary>
            <p className="mt-3 max-w-prose leading-7 text-ink/80">{item.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}

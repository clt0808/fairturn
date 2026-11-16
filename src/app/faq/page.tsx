import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

const items = [
  {
    q: "Is FairTurn the provider?",
    a: "No. Switching happens on the provider’s own site or app. FairTurn only chooses whose link or code is shown.",
  },
  {
    q: "Why is there more than one queue?",
    a: "Each provider has its own rotation, owner share, and boosts. A claim code from one provider cannot boost a link for another.",
  },
  {
    q: "How do I get the boost?",
    a: "Take a turn, join with that link or code, then add your own for the same provider and enter the claim code. It works once.",
  },
  {
    q: "What about the site owner’s link?",
    a: "The site owner's own link is included in the rotation.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl">Questions</h1>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.q} className="py-4">
            <summary className="cursor-pointer font-serif text-xl">{item.q}</summary>
            <p className="mt-2 leading-7 text-ink/80">{item.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}

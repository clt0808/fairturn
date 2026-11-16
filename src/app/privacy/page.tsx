import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-4xl">Privacy note</h1>
      <div className="mt-6 max-w-prose space-y-4 leading-7 text-ink/80">
        <p>
          FairTurn is a small queue. It is built to collect as little as possible, and it is not EDF. EDF’s own privacy
          policy applies once you continue onto edfenergy.com.
        </p>
        <h2 className="font-serif text-2xl text-ink">If you take a link</h2>
        <p>
          We do not ask who you are. We store the time, which link was handed out, a claim code, and a hash of your
          network address. The claim code is also saved in a cookie on this browser for 120 days so the add-a-link
          form can fill it in. The network-address hash is kept for up to two days, for rate limits. We do not store
          the address itself.
        </p>
        <h2 className="font-serif text-2xl text-ink">If you add a link</h2>
        <p>
          We store your email, the referral link, whether it is boosted, and how many times it has been handed out.
          That stays while the link is in the queue, including after an admin removes it, so the handout count is not
          lost. We do not use the email for marketing and we do not sell it. The admin can see it, because that is how
          a link is removed.
        </p>
        <h2 className="font-serif text-2xl text-ink">Cookies</h2>
        <p>
          Two cookies, both restricted so page scripts cannot read them. <span className="font-mono text-sm">fairturn_claim</span>{" "}
          remembers a claim code. <span className="font-mono text-sm">fairturn_admin</span> remembers an admin login
          for 12 hours. There are no advertising or analytics cookies.
        </p>
        <h2 className="font-serif text-2xl text-ink">Where it sits</h2>
        <p>
          The queue is a SQLite file on the server that runs this site. If you want your link deleted, ask the person
          who runs the queue and give them the email you used.
        </p>
      </div>
    </main>
  );
}

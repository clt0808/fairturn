import { edfScheme } from "@/lib/schemes/edf";

export function TermsNotice() {
  return (
    <aside className="border-b border-[#e2c8a4] bg-warn text-warn-ink" aria-label="EDF referral terms">
      <div className="mx-auto max-w-5xl px-4 py-3 text-sm leading-6">
        <p>
          <strong className="font-semibold">Before you use a link.</strong> EDF’s terms say a referral
          link is for friends and family. If EDF suspects commercial use, or that a link was sent to
          people the referrer does not know, EDF may withhold the reward from both the referrer and the
          new customer.{" "}
          <a className="underline underline-offset-2" href={edfScheme.termsUrl}>
            Read EDF’s terms
          </a>
          . FairTurn is not part of EDF.
        </p>
      </div>
    </aside>
  );
}

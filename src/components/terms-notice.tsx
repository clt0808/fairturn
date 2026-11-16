import { listSchemes } from "@/lib/schemes";

export function TermsNotice() {
  return (
    <aside className="border-b border-[#e2c8a4] bg-warn text-warn-ink" aria-label="Referral terms">
      <ul className="mx-auto max-w-5xl space-y-1 px-4 py-3 text-sm leading-6">
        {listSchemes().map((scheme) => (
          <li key={scheme.id}>
            {scheme.termsLine}{" "}
            <a className="underline underline-offset-2" href={scheme.termsUrl}>
              {scheme.supplierName} terms
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TermsNotice } from "@/components/terms-notice";
import { getDb } from "@/lib/db";
import { listLinks } from "@/lib/db/repository";
import { isDemoEmail } from "@/lib/format";
import { edfScheme } from "@/lib/schemes/edf";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FairTurn — a fair queue for EDF referral links",
    template: "%s · FairTurn",
  },
  description: `EDF Refer a Friend links, handed out in rotation. Until ${edfScheme.offerEndLabel} the published reward is ${edfScheme.referrerReward} for the referrer and ${edfScheme.newCustomerReward} for the new customer.`,
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = listLinks(getDb(), edfScheme.id).some((link) => link.active && isDemoEmail(link.email));

  return (
    <html lang="en-GB" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <TermsNotice />
        {demo ? (
          <p className="border-b border-line bg-moss px-4 py-2 text-center text-sm text-pine-deep">
            Sample queue for this prototype. Links stored against example.com are not real EDF customers.
          </p>
        ) : null}
        <div id="content" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}

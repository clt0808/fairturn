import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TermsNotice } from "@/components/terms-notice";
import { getDb } from "@/lib/db";
import { listLinks } from "@/lib/db/repository";
import { isDemoEmail } from "@/lib/format";
import { listSchemes } from "@/lib/schemes";
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
    default: "FairTurn — a fair queue for referral links",
    template: "%s · FairTurn",
  },
  description: "Each provider has its own rotation, so one link cannot take every turn.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await getDb();
  let demo = false;
  for (const scheme of listSchemes()) {
    if ((await listLinks(db, scheme.id)).some((link) => link.active && isDemoEmail(link.email))) {
      demo = true;
      break;
    }
  }

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
            Sample queue. Addresses at example.com are not real customers.
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

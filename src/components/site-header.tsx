import Link from "next/link";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/get", label: "Get a link" },
  { href: "/add", label: "Add my link" },
];

export function SiteHeader() {
  return (
    <header className="bg-pine-deep text-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-serif text-2xl leading-none tracking-tight">
          FairTurn
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-paper/90">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

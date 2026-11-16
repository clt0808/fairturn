import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-pine-deep text-paper">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
        <Link href="/" className="font-serif text-2xl leading-none tracking-tight">
          FairTurn
        </Link>
      </div>
    </header>
  );
}

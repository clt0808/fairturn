export function BonusBanner({ lines }: { lines: { id: string; text: string }[] }) {
  if (lines.length === 0) return null;
  return (
    <aside className="border-b border-[#e2c8a4] bg-warn text-warn-ink" aria-label="Current bonuses">
      <ul className="mx-auto max-w-5xl px-4 py-1.5 text-xs leading-5">
        {lines.map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
    </aside>
  );
}

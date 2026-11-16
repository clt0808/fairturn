export function maskReferralCode(code: string): string {
  const parts = code.split("-");
  if (parts.length !== 3) return "····";
  return `${parts[0]}-····-${parts[2]}`;
}

export function formatWhen(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(ms));
}

export function parseEmail(input: string): { ok: true; email: string } | { ok: false; error: string } {
  const email = input.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Enter the email address you want this link stored against." };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." };
  }
  return { ok: true, email };
}

export function isDemoEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@example.com");
}

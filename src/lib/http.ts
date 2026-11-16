import { createHash } from "crypto";

export function clientAddress(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const real = headerStore.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  return "unknown";
}

export function hashAddress(address: string): string {
  const salt = process.env.IP_HASH_SALT || "dev-salt-not-for-production";
  return createHash("sha256").update(`${salt}|${address}`).digest("hex");
}

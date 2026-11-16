import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "fairturn_admin";
export const CLAIM_COOKIE = "fairturn_claim";

const TWELVE_HOURS_SECONDS = 60 * 60 * 12;

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Compare via HMAC so the check does not leak the password’s length. */
export function passwordsMatch(input: string, expected: string): boolean {
  const key = "fairturn-password";
  const actual = createHmac("sha256", key).update(input).digest();
  const wanted = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

export function signAdminSession(now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TWELVE_HOURS_SECONDS;
  const payload = `v1.${exp}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function readAdminSession(value: string | undefined, now = Date.now()): boolean {
  if (!value || !secret()) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [version, expText, signature] = parts;
  if (version !== "v1" || !expText || !signature) return false;
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;

  const expected = createHmac("sha256", secret()).update(`${version}.${expText}`).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

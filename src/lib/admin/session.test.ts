import { afterEach, describe, expect, it } from "vitest";
import { passwordsMatch, readAdminSession, signAdminSession } from "./session";

const originalAuth = process.env.AUTH_SECRET;
const originalPassword = process.env.ADMIN_PASSWORD;

afterEach(() => {
  process.env.AUTH_SECRET = originalAuth;
  process.env.ADMIN_PASSWORD = originalPassword;
});

describe("admin session", () => {
  it("matches a password without caring about length", () => {
    expect(passwordsMatch("fairturn-demo", "fairturn-demo")).toBe(true);
    expect(passwordsMatch("fairturn-demo", "fairturn-demox")).toBe(false);
    expect(passwordsMatch("a", "ab")).toBe(false);
  });

  it("accepts a signed session until it expires", () => {
    process.env.AUTH_SECRET = "test-secret";
    const now = Date.parse("2026-11-16T12:00:00Z");
    const token = signAdminSession(now);
    expect(readAdminSession(token, now + 1000)).toBe(true);
    expect(readAdminSession(token, now + 13 * 60 * 60 * 1000)).toBe(false);
    expect(readAdminSession(`${token}x`, now + 1000)).toBe(false);
    expect(readAdminSession(undefined, now)).toBe(false);
  });
});

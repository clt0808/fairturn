import { describe, expect, it } from "vitest";
import { exceedsLimit, HOUR_MS, SUBMIT_RULES } from "./limits";

describe("exceedsLimit", () => {
  const now = 1_000_000_000_000;

  it("blocks once the window is full and ignores older events", () => {
    const stamps = [
      now - HOUR_MS - 1,
      now - 10,
      now - 9,
      now - 8,
      now - 7,
      now - 6,
    ];
    expect(exceedsLimit(stamps, now, SUBMIT_RULES)).toBe(true);
    expect(exceedsLimit(stamps.slice(0, 5), now, SUBMIT_RULES)).toBe(false);
  });

  it("does not count a timestamp in the future", () => {
    expect(exceedsLimit([now + 1], now, [{ windowMs: HOUR_MS, max: 1 }])).toBe(false);
  });
});

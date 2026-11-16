import { describe, expect, it } from "vitest";
import { offerPhase, parseEdfReferralUrl } from "./edf";

describe("parseEdfReferralUrl", () => {
  it("accepts the real EDF shape and canonicalises it", () => {
    expect(parseEdfReferralUrl(" https://edfenergy.com/quote/refer-a-friend/Glassy-Oak-677/ ")).toEqual({
      ok: true,
      code: "glassy-oak-677",
      canonicalUrl: "https://www.edfenergy.com/quote/refer-a-friend/glassy-oak-677",
    });
    expect(parseEdfReferralUrl("http://www.edfenergy.com/quote/refer-a-friend/horrid-grove-8631").ok).toBe(true);
  });

  it("rejects other sites, bare codes, extra paths, and tracking queries", () => {
    const rejected = [
      "glassy-oak-677",
      "https://octopus.energy/quote/refer-a-friend/glassy-oak-677",
      "https://www.edfenergy.com.evil.com/quote/refer-a-friend/glassy-oak-677",
      "https://www.edfenergy.com/quote/refer-a-friend/",
      "https://www.edfenergy.com/quote/refer-a-friend/glassy-oak-677/extra",
      "https://www.edfenergy.com/quote/refer-a-friend/glassy-oak-677?utm=share",
      "https://user:pass@www.edfenergy.com/quote/refer-a-friend/glassy-oak-677",
      "javascript:alert(1)",
      "https://www.edfenergy.com/quote/refer-a-friend/GEORGE25132",
      "",
    ];
    for (const input of rejected) {
      expect(parseEdfReferralUrl(input).ok, input).toBe(false);
    }
  });
});

describe("offerPhase", () => {
  it("treats the published window as inclusive in London", () => {
    expect(offerPhase(new Date("2026-11-15T23:30:00Z"))).toBe("upcoming");
    expect(offerPhase(new Date("2026-11-16T00:30:00Z"))).toBe("live");
    expect(offerPhase(new Date("2027-01-05T12:00:00Z"))).toBe("live");
    expect(offerPhase(new Date("2027-01-06T00:30:00Z"))).toBe("ended");
  });
});

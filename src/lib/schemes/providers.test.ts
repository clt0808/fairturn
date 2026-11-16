import { describe, expect, it } from "vitest";
import { parseFuseReferralCode } from "./fuse";
import { parseOctopusReferralUrl } from "./octopus";
import { parseZopaReferralUrl } from "./zopa";

describe("parseOctopusReferralUrl", () => {
  it("accepts Octopus’s adjective-noun-number link", () => {
    expect(parseOctopusReferralUrl(" http://share.octopus.energy/Ruby-Snail-729/ ")).toEqual({
      ok: true,
      code: "ruby-snail-729",
      canonicalUrl: "https://share.octopus.energy/ruby-snail-729",
    });
  });

  it("rejects other hosts, queries, and bare codes", () => {
    for (const input of [
      "ruby-snail-729",
      "https://octopus.energy/ruby-snail-729",
      "https://www.share.octopus.energy/ruby-snail-729",
      "https://share.octopus.energy/ruby-snail-729?utm=1",
      "https://share.octopus.energy/ruby/snail",
      "https://www.edfenergy.com/quote/refer-a-friend/glassy-oak-677",
    ]) {
      expect(parseOctopusReferralUrl(input).ok, input).toBe(false);
    }
  });
});

describe("parseZopaReferralUrl", () => {
  it("accepts the app share link and lowercases the code", () => {
    expect(parseZopaReferralUrl("https://zopa.com/mgma?referralCode=0123456789ABCDEF0123")).toEqual({
      ok: true,
      code: "0123456789abcdef0123",
      canonicalUrl: "https://www.zopa.com/mgma?referralCode=0123456789abcdef0123",
    });
  });

  it("rejects extra parameters and other paths", () => {
    for (const input of [
      "0123456789abcdef0123",
      "https://www.zopa.com/refer?referralCode=0123456789abcdef0123",
      "https://www.zopa.com/mgma?referralCode=0123456789abcdef0123&utm=1",
      "https://www.zopa.com/mgma?code=0123456789abcdef0123",
      "https://www.zopa.com/mgma?referralCode=short",
    ]) {
      expect(parseZopaReferralUrl(input).ok, input).toBe(false);
    }
  });
});

describe("parseFuseReferralCode", () => {
  it("normalises a short alphanumeric code", () => {
    expect(parseFuseReferralCode(" po-litics ")).toEqual({
      ok: true,
      code: "POLITICS",
      canonicalUrl: "https://www.fuseenergy.com/",
    });
  });

  it("rejects links, symbols, and very short codes", () => {
    for (const input of ["https://www.fuseenergy.com/", "AB", "CODE!", ""]) {
      expect(parseFuseReferralCode(input).ok, input).toBe(false);
    }
  });
});

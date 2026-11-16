import { describe, expect, it } from "vitest";
import { bonusLine } from "./bonus";
import { edfScheme } from "./edf";
import { octopusScheme } from "./octopus";

describe("bonusLine", () => {
  it("hides a published end date after that London day", () => {
    expect(bonusLine(edfScheme, new Date("2027-01-05T12:00:00Z"))).toBe("EDF: £100 + £75 · until 5 Jan 2027");
    expect(bonusLine(edfScheme, new Date("2027-01-06T00:30:00Z"))).toBe("EDF: £100 + £75");
  });

  it("omits the date when the provider does not publish one", () => {
    expect(bonusLine(octopusScheme, new Date("2027-01-06T00:30:00Z"))).toBe("Octopus: £50 each");
  });
});

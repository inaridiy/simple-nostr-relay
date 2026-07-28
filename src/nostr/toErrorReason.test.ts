import { describe, expect, it } from "vitest";
import { toErrorReason } from "./toErrorReason";

describe("toErrorReason", () => {
  it("preserves a standardized reason prefix", () => {
    expect(toErrorReason(new Error("invalid: malformed event"))).toBe("invalid: malformed event");
  });

  it("wraps unclassified errors", () => {
    expect(toErrorReason(new Error("database unavailable"))).toBe("error: database unavailable");
    expect(toErrorReason("unknown")).toBe("error: unknown error");
  });
});

import { describe, it, expect } from "vitest";
import { redirectSchema } from "./schemas";

describe("redirectSchema status_code", () => {
  const base = { from_path: "/old", to_path: "/new" };

  it('coerces string "301" to 301', () => {
    const result = redirectSchema.parse({ ...base, status_code: "301" });
    expect(result.status_code).toBe(301);
  });

  it('coerces string "410" to 410', () => {
    const result = redirectSchema.parse({ ...base, status_code: "410" });
    expect(result.status_code).toBe(410);
  });

  it("accepts numeric 301", () => {
    const result = redirectSchema.parse({ ...base, status_code: 301 });
    expect(result.status_code).toBe(301);
  });

  it("rejects out-of-whitelist numeric 999", () => {
    expect(() =>
      redirectSchema.parse({ ...base, status_code: 999 })
    ).toThrow();
  });

  it("rejects non-numeric strings", () => {
    expect(() =>
      redirectSchema.parse({ ...base, status_code: "abc" })
    ).toThrow();
  });

  it("defaults to 301 when status_code is omitted", () => {
    const result = redirectSchema.parse(base);
    expect(result.status_code).toBe(301);
  });
});

import { describe, it, expect } from "vitest";
import { productSchema, redirectSchema } from "./schemas";

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

// Phase B Slice 6 follow-up — the operator-controlled "new" tag
// only earns the name "operator-controlled" if the form-to-action
// persistence path is locked. The admin product form ships a
// checkbox `name="is_new"`; the browser serializes that as `"on"`
// when checked and omits the key entirely when unchecked. The
// Zod schema is the boundary between FormData and the Supabase
// insert/update payload, so asserting it here covers what the
// browser actually sends — without standing up a fake Supabase
// integration test (the shadcn-style action handler forwards
// `parsed.is_new` straight to `supabase.from("products").insert/
// .update`, so coercion at this layer is the persistence
// contract).
describe("productSchema is_new (operator-controlled new tag)", () => {
  const base = {
    slug: "alazani-sofa",
    // Nil UUID — accepted by Zod's uuid format. The schema requires
    // a versioned UUID OR the nil/max UUID; the nil form is the
    // shortest valid placeholder for fixture data.
    category_id: "00000000-0000-0000-0000-000000000000",
    name_ka: "ალაზანი",
    name_en: "Alazani",
    price: 4200,
  };

  // Checkbox checked — browser sends "on".
  it('coerces FormData "on" to true (the checked-checkbox path)', () => {
    const result = productSchema.parse({ ...base, is_new: "on" });
    expect(result.is_new).toBe(true);
  });

  // Checkbox unchecked — browser omits the key entirely. The
  // schema's `.default(false)` fills it in so the action sends
  // `is_new: false` rather than `undefined`. This is the path
  // every existing-product update goes through when the operator
  // saves with the box unchecked.
  it("defaults to false when the key is omitted (the unchecked-checkbox path)", () => {
    const result = productSchema.parse(base);
    expect(result.is_new).toBe(false);
  });

  // Stale form payloads can resend an empty string when JS
  // serializes the form differently. Empty string is a valid
  // falsy coercion target (`Boolean("") === false`).
  it('coerces empty-string "" to false', () => {
    const result = productSchema.parse({ ...base, is_new: "" });
    expect(result.is_new).toBe(false);
  });

  // Direct boolean values (e.g. when an action helper passes a
  // typed object instead of FormData) round-trip cleanly.
  it("accepts a literal boolean true", () => {
    const result = productSchema.parse({ ...base, is_new: true });
    expect(result.is_new).toBe(true);
  });

  it("accepts a literal boolean false", () => {
    const result = productSchema.parse({ ...base, is_new: false });
    expect(result.is_new).toBe(false);
  });

  // Symmetry check: `is_featured` shares the exact coercion shape;
  // both fields land at the same default and follow the same
  // "on" → true mapping, so a future refactor can't unify them and
  // accidentally invert one branch.
  it("matches is_featured coercion behavior so a future unifying refactor stays honest", () => {
    const checked = productSchema.parse({
      ...base,
      is_new: "on",
      is_featured: "on",
    });
    expect(checked.is_new).toBe(checked.is_featured);
    expect(checked.is_new).toBe(true);

    const unchecked = productSchema.parse(base);
    expect(unchecked.is_new).toBe(unchecked.is_featured);
    expect(unchecked.is_new).toBe(false);
  });
});

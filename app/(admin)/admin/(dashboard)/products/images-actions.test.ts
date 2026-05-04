// Tests for the product-images server actions. Each action gets a
// happy and a sad path. The Supabase client is mocked with a chain
// builder that resolves either via Thenable (`await query`) or via a
// terminator (`.single()` / `.maybeSingle()`).

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

const requireAdminMock = vi.fn(async () => ({
  userId: "u-1",
  email: "a@b.c",
  role: "admin" as const,
}));
const notifyRevalidationMock = vi.fn<
  (payload: unknown) => Promise<undefined>
>();
const logErrorMock = vi.fn<(err: unknown, ctx?: unknown) => undefined>();
const fromMock = vi.fn<(table: string) => unknown>();
const storageRemoveMock = vi.fn<
  (paths: string[]) => Promise<{ error: unknown }>
>();
// Default behaviour for the mocks that have no per-test override.
notifyRevalidationMock.mockImplementation(async () => undefined);
storageRemoveMock.mockImplementation(async () => ({ error: null }));

vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: () => requireAdminMock(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => fromMock(table),
    storage: {
      from: () => ({ remove: storageRemoveMock }),
    },
  }),
}));

vi.mock("@/lib/revalidation/notify", () => ({
  notifyRevalidation: (payload: unknown) => notifyRevalidationMock(payload),
}));

vi.mock("@/lib/observability", () => ({
  logError: (err: unknown, ctx?: unknown) => logErrorMock(err, ctx),
}));

import {
  addProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryImageAction,
  updateImageAltAction,
} from "./images-actions";
import { MAX_IMAGES_PER_PRODUCT } from "./images-config";

// ---------------------------------------------------------------------------
// Chain mock
// ---------------------------------------------------------------------------

type ChainOpts = {
  awaited?: { data?: unknown; error?: unknown; count?: number | null };
  single?: { data?: unknown; error?: unknown };
  maybeSingle?: { data?: unknown; error?: unknown };
};

function mkChain(opts: ChainOpts = {}) {
  const awaited = opts.awaited ?? { data: null, error: null, count: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  for (const m of [
    "select",
    "eq",
    "is",
    "in",
    "neq",
    "order",
    "range",
    "limit",
    "insert",
    "update",
    "delete",
    "upsert",
  ]) {
    chain[m] = () => chain;
  }
  chain.single = () =>
    Promise.resolve(opts.single ?? { data: null, error: null });
  chain.maybeSingle = () =>
    Promise.resolve(opts.maybeSingle ?? { data: null, error: null });
  chain.then = (resolve: (v: unknown) => unknown) => resolve(awaited);
  return chain;
}

// Valid v4 UUIDs. Zod 4's `.uuid()` enforces a real version nibble
// (the third group must start with 1–8), so all-zero placeholders fail.
const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_3 = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  fromMock.mockReset();
  storageRemoveMock.mockClear();
  notifyRevalidationMock.mockClear();
  logErrorMock.mockClear();
});

afterEach(() => {
  // Each test programs fromMock with .mockReturnValueOnce calls;
  // the reset above keeps state isolated between tests.
});

// ---------------------------------------------------------------------------
// addProductImageAction
// ---------------------------------------------------------------------------

describe("addProductImageAction", () => {
  it("inserts when under the per-product cap and revalidates", async () => {
    fromMock
      .mockReturnValueOnce(mkChain({ awaited: { count: 3, error: null } }))
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await addProductImageAction({
      product_id: VALID_UUID,
      storage_path: "products/x/a.jpg",
      alt_ka: "ka",
      alt_en: "en",
    });

    expect(result.ok).toBe(true);
    expect(notifyRevalidationMock).toHaveBeenCalledOnce();
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("rejects when at the per-product cap", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({ awaited: { count: MAX_IMAGES_PER_PRODUCT, error: null } })
    );

    const result = await addProductImageAction({
      product_id: VALID_UUID,
      storage_path: "products/x/a.jpg",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Limit reached/);
    expect(notifyRevalidationMock).not.toHaveBeenCalled();
  });

  it("logs and reports the DB error when the insert fails", async () => {
    const insertErr = { message: "RLS denied", code: "42501" };
    fromMock
      .mockReturnValueOnce(mkChain({ awaited: { count: 0, error: null } }))
      .mockReturnValueOnce(mkChain({ awaited: { error: insertErr } }));

    const result = await addProductImageAction({
      product_id: VALID_UUID,
      storage_path: "products/x/a.jpg",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("RLS denied");
    expect(logErrorMock).toHaveBeenCalledOnce();
    const ctx = logErrorMock.mock.calls[0]![1] as { route: string };
    expect(ctx.route).toBe("products/images-actions:addProductImage");
  });
});

// ---------------------------------------------------------------------------
// updateImageAltAction
// ---------------------------------------------------------------------------

describe("updateImageAltAction", () => {
  it("updates alt fields and revalidates on success", async () => {
    fromMock.mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await updateImageAltAction({
      image_id: VALID_UUID,
      alt_ka: "ხელნაკეთი",
      alt_en: "Handmade",
    });

    expect(result.ok).toBe(true);
    expect(notifyRevalidationMock).toHaveBeenCalledOnce();
  });

  it("returns the DB error message on failure and logs", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({ awaited: { error: { message: "fail" } } })
    );

    const result = await updateImageAltAction({
      image_id: VALID_UUID,
      alt_ka: "",
      alt_en: "",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("fail");
    expect(logErrorMock).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// setPrimaryImageAction
// ---------------------------------------------------------------------------

describe("setPrimaryImageAction", () => {
  it("rejects an invalid id without touching Supabase", async () => {
    const result = await setPrimaryImageAction("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns ok:true as a no-op when the image is already primary", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({
        single: {
          data: {
            id: VALID_UUID,
            product_id: VALID_UUID_2,
            is_primary: true,
          },
        },
      })
    );

    const result = await setPrimaryImageAction(VALID_UUID);
    expect(result.ok).toBe(true);
    // Only the fetch chain runs — no demote/promote.
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(notifyRevalidationMock).not.toHaveBeenCalled();
  });

  it("demotes the existing primary then promotes the chosen image", async () => {
    fromMock
      // 1. Fetch target.
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              product_id: VALID_UUID_2,
              is_primary: false,
            },
          },
        })
      )
      // 2. Demote existing primary for product.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }))
      // 3. Promote chosen image.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await setPrimaryImageAction(VALID_UUID);
    expect(result.ok).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(3);
    expect(notifyRevalidationMock).toHaveBeenCalledOnce();
  });

  it("returns image-not-found when the fetch returns no row", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({ single: { data: null, error: null } })
    );
    const result = await setPrimaryImageAction(VALID_UUID);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it("logs and surfaces the demote error", async () => {
    fromMock
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              product_id: VALID_UUID_2,
              is_primary: false,
            },
          },
        })
      )
      .mockReturnValueOnce(
        mkChain({ awaited: { error: { message: "demote-fail" } } })
      );

    const result = await setPrimaryImageAction(VALID_UUID);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("demote-fail");
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderProductImagesAction
// ---------------------------------------------------------------------------

describe("reorderProductImagesAction", () => {
  it("rejects an empty id list", async () => {
    const result = await reorderProductImagesAction({
      product_id: VALID_UUID,
      ordered_ids: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when ids do not all belong to the product", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({
        awaited: {
          data: [
            { id: VALID_UUID, product_id: VALID_UUID }, // wrong product
            { id: VALID_UUID_2, product_id: VALID_UUID },
          ],
          error: null,
        },
      })
    );

    const result = await reorderProductImagesAction({
      product_id: VALID_UUID_3,
      ordered_ids: [VALID_UUID, VALID_UUID_2],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/do not belong/i);
  });

  it("issues N updates in order and revalidates on success", async () => {
    const productId = VALID_UUID_3;
    fromMock
      // 1. Fetch + ownership check.
      .mockReturnValueOnce(
        mkChain({
          awaited: {
            data: [
              { id: VALID_UUID, product_id: productId },
              { id: VALID_UUID_2, product_id: productId },
            ],
            error: null,
          },
        })
      )
      // 2 + 3. One update per id.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }))
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await reorderProductImagesAction({
      product_id: productId,
      ordered_ids: [VALID_UUID, VALID_UUID_2],
    });
    expect(result.ok).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(3); // 1 fetch + 2 updates
    expect(notifyRevalidationMock).toHaveBeenCalledOnce();
  });

  it("aborts and surfaces the first update error", async () => {
    fromMock
      .mockReturnValueOnce(
        mkChain({
          awaited: {
            data: [
              { id: VALID_UUID, product_id: VALID_UUID_3 },
              { id: VALID_UUID_2, product_id: VALID_UUID_3 },
            ],
            error: null,
          },
        })
      )
      .mockReturnValueOnce(mkChain({ awaited: { error: { message: "boom" } } }));

    const result = await reorderProductImagesAction({
      product_id: VALID_UUID_3,
      ordered_ids: [VALID_UUID, VALID_UUID_2],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("boom");
    expect(logErrorMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteProductImageAction
// ---------------------------------------------------------------------------

describe("deleteProductImageAction", () => {
  it("rejects an invalid id without touching Supabase", async () => {
    const result = await deleteProductImageAction("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns image-not-found when the row is missing", async () => {
    fromMock.mockReturnValueOnce(
      mkChain({ single: { data: null, error: null } })
    );
    const result = await deleteProductImageAction(VALID_UUID);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it("deletes a non-primary image, removes the storage object, and revalidates", async () => {
    fromMock
      // 1. Fetch existing.
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              storage_path: "products/x/a.jpg",
              product_id: VALID_UUID_2,
              is_primary: false,
            },
          },
        })
      )
      // 2. Delete row.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await deleteProductImageAction(VALID_UUID);
    expect(result.ok).toBe(true);
    expect(storageRemoveMock).toHaveBeenCalledOnce();
    expect(storageRemoveMock).toHaveBeenCalledWith(["products/x/a.jpg"]);
    expect(notifyRevalidationMock).toHaveBeenCalledOnce();
  });

  it("auto-promotes the next image when the deleted row was primary", async () => {
    fromMock
      // 1. Fetch existing (primary).
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              storage_path: "products/x/a.jpg",
              product_id: VALID_UUID_2,
              is_primary: true,
            },
          },
        })
      )
      // 2. Delete row.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }))
      // 3. Find next image to promote.
      .mockReturnValueOnce(
        mkChain({ maybeSingle: { data: { id: VALID_UUID_3 } } })
      )
      // 4. Promote that image.
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await deleteProductImageAction(VALID_UUID);
    expect(result.ok).toBe(true);
    // 4 from() calls: fetch, delete, find-next, promote.
    expect(fromMock).toHaveBeenCalledTimes(4);
  });

  it("skips the storage remove when storage_path is an external URL (seed data)", async () => {
    fromMock
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              storage_path: "https://picsum.photos/600/800",
              product_id: VALID_UUID_2,
              is_primary: false,
            },
          },
        })
      )
      .mockReturnValueOnce(mkChain({ awaited: { error: null } }));

    const result = await deleteProductImageAction(VALID_UUID);
    expect(result.ok).toBe(true);
    expect(storageRemoveMock).not.toHaveBeenCalled();
  });

  it("surfaces the delete-row error and skips storage cleanup", async () => {
    fromMock
      .mockReturnValueOnce(
        mkChain({
          single: {
            data: {
              id: VALID_UUID,
              storage_path: "products/x/a.jpg",
              product_id: VALID_UUID_2,
              is_primary: false,
            },
          },
        })
      )
      .mockReturnValueOnce(
        mkChain({ awaited: { error: { message: "del-fail" } } })
      );

    const result = await deleteProductImageAction(VALID_UUID);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("del-fail");
    expect(storageRemoveMock).not.toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalled();
  });
});

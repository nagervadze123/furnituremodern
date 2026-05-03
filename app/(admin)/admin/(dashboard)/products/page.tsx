// /admin/products — list view with search, filter, and pagination.

import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
    deleted?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categoryFilter = params.category?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdminClient();

  // Build the base query. We pull both published and unpublished rows
  // here because admins need to see drafts.
  let listQuery = supabase
    .from("products")
    .select(
      "id, slug, name_en, name_ka, price, currency, is_published, is_featured, sort_order, categories!inner ( slug, name_en )",
      { count: "exact" }
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) listQuery = listQuery.ilike("name_en", `%${q}%`);
  if (categoryFilter) listQuery = listQuery.eq("categories.slug", categoryFilter);

  const [{ data: rows, count, error }, categoriesQuery] = await Promise.all([
    listQuery,
    supabase
      .from("categories")
      .select("slug, name_en")
      .order("sort_order", { ascending: true }),
  ]);

  const categories = categoriesQuery.data ?? [];
  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <div>
      {/* The header row stacks on the smallest phones so the "New
          product" CTA can sit full-width below the title. flex-wrap +
          gap-y-3 absorb anything in between. min-w-0 keeps the title
          column from forcing the CTA off-screen at narrow widths. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} total · page {page} of {totalPages}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden className="h-4 w-4" />
          New product
        </Link>
      </div>

      {params.deleted ? (
        <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          Product deleted.
        </p>
      ) : null}

      {/* Filters wrap to a 2-row layout on phones (search input full
          width, then [select][submit]). text-base on the controls
          dodges the iOS auto-zoom-on-focus. */}
      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by English name…"
          className="block w-full min-w-0 min-h-10 flex-1 rounded-md border border-input bg-background px-3 text-base sm:w-auto sm:text-sm"
        />
        <select
          name="category"
          defaultValue={categoryFilter}
          className="block min-w-0 min-h-10 rounded-md border border-input bg-background px-2 text-base sm:text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name_en}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm" className="min-h-10">
          Filter
        </Button>
      </form>

      {/* Table — intentional horizontal scroll container. Row content
          (long names, monospaced slugs) routinely exceeds phone width;
          users scroll the table, the page itself stays anchored. */}
      <div className="scroll-x-touch mt-6 rounded-xl border border-border bg-background">
        {error ? (
          <p className="p-6 text-sm text-destructive">{error.message}</p>
        ) : !rows || rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No products match the current filters.
          </p>
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {(rows as unknown as ProductListRow[]).map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name_en}</p>
                    <p className="text-xs text-muted-foreground">{p.name_ka}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.categories?.name_en ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {Number(p.price).toLocaleString()} {p.currency}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      published={p.is_published}
                      featured={p.is_featured}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="-mx-2 inline-flex min-h-10 items-center rounded px-2 text-sm font-medium text-foreground/80 hover:text-foreground"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination — min-h-10 keeps the rounded buttons tappable on
          phones; the row stays right-aligned on desktop. */}
      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-6 flex flex-wrap items-center justify-end gap-2 text-sm"
        >
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1, q, categoryFilter)}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 transition-colors hover:bg-muted"
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1, q, categoryFilter)}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 transition-colors hover:bg-muted"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

type ProductListRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ka: string;
  price: number | string;
  currency: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  categories: { slug: string; name_en: string } | null;
};

function StatusPill({
  published,
  featured,
}: {
  published: boolean;
  featured: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <span
        className={
          published
            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
            : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
        }
      >
        {published ? "Published" : "Draft"}
      </span>
      {featured ? (
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
          Featured
        </span>
      ) : null}
    </div>
  );
}

function buildPageUrl(page: number, q: string, category: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  params.set("page", String(page));
  return `/admin/products?${params.toString()}`;
}

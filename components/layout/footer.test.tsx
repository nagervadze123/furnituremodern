// Element-tree tests for the redesigned Footer. Mocks next-intl/server's
// getTranslations + getLocale (because vitest runs without a request
// scope) and the data-layer category fetcher (because it imports
// `server-only`).
//
// Vitest runs in node mode and we never render through React, so the
// `type` of a sub-component element is the real (or mocked) function
// reference — its body is not executed. We assert by searching for
// elements whose props match the expected shape (e.g. `href` for
// links, `id` for headings) instead of by inspecting the inner
// rendered output of the sub-component.

import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    return (key: string) => `${namespace ?? "fallback"}.${key}`;
  },
  getLocale: async () => "ka",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: unknown;
    className?: string;
  }) => ({
    type: "a",
    props: { href, className, children },
    key: null,
  }),
}));

vi.mock("@/lib/data/categories", () => ({
  getFeaturedNavCategories: async () => [
    {
      slug: "sofas",
      name: { ka: "დივნები", en: "Sofas" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x", en: "x" },
      sortOrder: 0,
      isFeaturedInNav: true,
    },
    {
      slug: "bedrooms",
      name: { ka: "საძინებლები", en: "Bedrooms" },
      description: { ka: "x", en: "x" },
      intro: { ka: "x", en: "x" },
      sortOrder: 1,
      isFeaturedInNav: true,
    },
  ],
}));

import { Footer } from "./footer";
import { siteConfig } from "@/lib/site-config";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandMark } from "./BrandMark";
import { ManageLink } from "@/components/consent/manage-link";

type AnyElement = ReactElement<{
  children?: unknown;
  className?: string;
  href?: string;
  id?: string;
}> & { type: unknown };

function flatText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatText).join("");
  if (typeof node === "object" && "props" in (node as AnyElement)) {
    return flatText((node as AnyElement).props?.children);
  }
  return "";
}

function findAll(
  node: unknown,
  predicate: (el: AnyElement) => boolean,
  out: AnyElement[] = []
): AnyElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  const el = node as AnyElement;
  if (predicate(el)) out.push(el);
  findAll((el.props as Record<string, unknown>)?.children, predicate, out);
  return out;
}

describe("Footer", () => {
  it("renders the BrandMark component in the first column", async () => {
    const tree = (await Footer()) as AnyElement;
    const brand = findAll(tree, (el) => el.type === BrandMark);
    expect(brand.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the four labelled column headings (Explore, Customer, Connect)", async () => {
    const tree = (await Footer()) as AnyElement;
    // Footer columns render as <h3> so they sit below the page-level
    // h1 (hero) / h2 (sections) hierarchy without breaking heading
    // order for axe/Lighthouse audits.
    const headings = findAll(tree, (el) => el.type === "h3");
    const ids = headings
      .map((h) => (h.props as Record<string, unknown>).id)
      .filter(Boolean);
    expect(ids).toContain("footer-explore-heading");
    expect(ids).toContain("footer-customer-heading");
    expect(ids).toContain("footer-connect-heading");
    // Visit column does NOT have an id-bound nav label (it wraps an
    // <address>, not a <nav>). The label key still appears in the body.
    expect(flatText(tree)).toContain("footer.visit_label");
  });

  it("renders home + every featured category + search in the Explore column", async () => {
    const tree = (await Footer()) as AnyElement;
    const linkLikes = findAll(
      tree,
      (el) => typeof (el.props as Record<string, unknown>).href === "string"
    );
    const hrefs = linkLikes.map(
      (l) => (l.props as Record<string, unknown>).href as string
    );
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/sofas");
    expect(hrefs).toContain("/bedrooms");
    expect(hrefs).toContain("/search");
  });

  it("renders the privacy link, manage-cookies trigger, and contact mailto", async () => {
    const tree = (await Footer()) as AnyElement;
    const linkLikes = findAll(
      tree,
      (el) => typeof (el.props as Record<string, unknown>).href === "string"
    );
    const hrefs = linkLikes.map(
      (l) => (l.props as Record<string, unknown>).href as string
    );
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain(`mailto:${siteConfig.contact.email}`);

    const manageLinks = findAll(tree, (el) => el.type === ManageLink);
    expect(manageLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the address, phone, and email from siteConfig", async () => {
    const tree = (await Footer()) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain(siteConfig.contact.address.street);
    expect(text).toContain(siteConfig.contact.address.city);
    expect(text).toContain(siteConfig.contact.phone);
    expect(text).toContain(siteConfig.contact.email);
  });

  it("renders Instagram + Facebook social links from siteConfig", async () => {
    const tree = (await Footer()) as AnyElement;
    const linkLikes = findAll(
      tree,
      (el) => typeof (el.props as Record<string, unknown>).href === "string"
    );
    const hrefs = linkLikes
      .map((l) => (l.props as Record<string, unknown>).href as string)
      .filter((h) => h.startsWith("http"));
    expect(hrefs).toContain(siteConfig.social.instagram);
    expect(hrefs).toContain(siteConfig.social.facebook);
  });

  it("renders the copyright with current year + legal name", async () => {
    const tree = (await Footer()) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain(String(new Date().getFullYear()));
    expect(text).toContain(siteConfig.legalName);
  });

  it("renders the LanguageSwitcher in the bottom band", async () => {
    const tree = (await Footer()) as AnyElement;
    const switchers = findAll(tree, (el) => el.type === LanguageSwitcher);
    expect(switchers.length).toBeGreaterThanOrEqual(1);
  });

  it("the visit column's opening hours read from siteConfig", async () => {
    const tree = (await Footer()) as AnyElement;
    const text = flatText(tree);
    expect(text).toContain(siteConfig.contact.openingHours[0].opens);
    expect(text).toContain(siteConfig.contact.openingHours[0].closes);
  });
});

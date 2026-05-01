// Single source of truth for the main navigation.
//
// Every nav surface (desktop header, mobile drawer, footer "Explore"
// list) reads from this file. Adding a 5th item or a dropdown requires
// editing this file only — the renderers handle the rest.

/**
 * One nav entry. Children are rendered as a dropdown (one level deep).
 *
 * - `labelKey` is a key into `messages/{locale}.json` under the
 *   "nav" namespace, so labels stay translatable.
 * - `href` is a locale-relative path (no /ka or /en prefix). The
 *   locale-aware <Link> from `i18n/navigation.ts` adds the prefix.
 */
export type NavItem = {
  labelKey: NavLabelKey;
  href: string;
  children?: NavItem[];
};

/**
 * Allowed translation keys. Keep this union in sync with the "nav"
 * block in `messages/ka.json` and `messages/en.json` so a typo in
 * `labelKey` becomes a TypeScript error rather than a missing label.
 */
export type NavLabelKey =
  | "home"
  | "sofas"
  | "bedrooms"
  | "tablesChairs";

/**
 * Main navigation, in display order.
 *
 * To add a top-level item:
 *   1. Add an entry here.
 *   2. Add its label to "nav" in `messages/ka.json` and `messages/en.json`.
 *   3. Add the matching key to `NavLabelKey` above.
 *
 * To add a dropdown:
 *   Pass a `children` array of NavItem entries. Renderers show a
 *   one-level dropdown automatically.
 */
export const mainNav: NavItem[] = [
  { labelKey: "home", href: "/" },
  { labelKey: "sofas", href: "/sofas" },
  { labelKey: "bedrooms", href: "/bedrooms" },
  { labelKey: "tablesChairs", href: "/tables-chairs" },
];

/**
 * Subset used in the footer's "Explore" column. Today this matches the
 * main nav minus Home (the logo-link to home is enough in the footer).
 */
export const footerExploreNav: NavItem[] = mainNav.filter(
  (item) => item.labelKey !== "home"
);

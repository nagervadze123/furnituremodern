// Shape of a single navigation entry. Used by header, footer, and the
// desktop/mobile navs as their prop type.
//
// Phase 5 Task 3: nav items are no longer code-defined. The header and
// footer build their lists at request time from the dynamic category
// list (`getFeaturedNavCategories(locale)`), so labels here are
// already-translated strings — no `labelKey` indirection.
export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
};

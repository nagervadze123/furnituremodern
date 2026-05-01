// Locale-aware navigation helpers. Use these in place of next/link and
// next/navigation so that all internal links automatically include the
// current locale prefix (/ka/sofas instead of /sofas).

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

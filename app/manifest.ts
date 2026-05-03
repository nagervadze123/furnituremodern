// Web App Manifest — drives "Add to Home Screen" / installable PWA UX.
//
// Next.js renders this at /manifest.webmanifest and auto-emits the
// <link rel="manifest"> tag in <head>. Values mirror lib/site-config.ts
// where practical so a brand rename ripples through automatically.
//
// Placeholder colours and icons today — refresh with the final identity
// before launch (see CHECKLIST §"Before you launch" → PWA).

import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Theme + background pulled from the light palette in app/globals.css.
// Matches the viewport.themeColor "light" branch declared in app/layout.tsx
// so the browser chrome matches the rendered page on first paint.
const THEME_COLOR_LIGHT = "#fafaf6";
const BACKGROUND_COLOR = "#fafaf6";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription.ka,
    lang: "ka-GE",
    dir: "ltr",
    // Default locale is ka — installed home-screen launches land on the
    // Georgian home page, matching how proxy.ts redirects the bare "/".
    start_url: "/ka",
    scope: "/",
    display: "standalone",
    theme_color: THEME_COLOR_LIGHT,
    background_color: BACKGROUND_COLOR,
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

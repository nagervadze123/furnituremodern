// Web App Manifest — drives "Add to Home Screen" / installable PWA UX.
//
// Next.js renders this at /manifest.webmanifest and auto-emits the
// <link rel="manifest"> tag in <head>. Values mirror lib/site-config.ts
// so a brand rename ripples through automatically.
//
// Two colour fields with different roles:
//   • theme_color — Android task switcher / installed-app status bar.
//     Brand accent (terracotta) so the installed app is recognisably
//     Furnituremodern at the OS level.
//   • background_color — splash screen behind the icon while the app
//     boots. Brand background so the splash → first paint reads as one
//     continuous surface (and matches the cream maskable icon plate).
//
// The <meta name="theme-color"> tag in app/layout.tsx serves the
// in-browser-tab chrome and uses the light/dark page background instead
// — different surface, different colour, on purpose.

import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

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
    theme_color: siteConfig.brand.accent,
    background_color: siteConfig.brand.background,
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
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
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

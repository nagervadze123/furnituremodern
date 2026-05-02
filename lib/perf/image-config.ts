// next/image configuration, extracted so tests and next.config.ts can
// share the same source of truth. Keeping this in a plain module (no
// next-intl / bundle-analyzer wrappers) means vitest can import it
// without dragging in Next's runtime.
//
// Calibrated against:
//   • the Tailwind breakpoints used by components/sections/*
//   • the real phone widths users hit (375, 414 on iOS; 360 on Android)
//   • the Supabase Storage origin we serve uploaded photos from
//   • the picsum placeholder hosts we ship until real photos land

import type { NextConfig } from "next";

type ImagesConfig = NonNullable<NextConfig["images"]>;

export function buildImagesConfig(supabaseUrl: string | undefined): ImagesConfig {
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";

  return {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
    deviceSizes: [360, 375, 414, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  };
}

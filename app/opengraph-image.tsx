// Default OpenGraph image, generated at build time.
// Served at /opengraph-image — referenced by every page that does not
// override `openGraph.images` itself.
//
// Why generate one instead of shipping a static PNG? Easier to keep the
// brand wordmark in sync; updating siteConfig.name updates the image.

import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

// Standard OG dimensions: 1200×630 maximizes coverage on Facebook,
// X (Twitter), LinkedIn, iMessage, etc.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Export the route as static so the image is generated once at build time.
export const dynamic = "force-static";

// Re-exported as `alt` so social platforms have descriptive text.
export const alt = `${siteConfig.name} — modern furniture from Tbilisi`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          // Warm cream background, matching the site palette.
          backgroundColor: "#fbf8f3",
          // Subtle gradient line at the bottom in our terracotta accent.
          backgroundImage:
            "linear-gradient(180deg, #fbf8f3 0%, #fbf8f3 88%, #b85c38 88%, #b85c38 100%)",
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: "#7a6f5e",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: 110,
            color: "#28201a",
            lineHeight: 1.05,
            marginTop: 32,
            // Satori (the renderer) needs explicit fontWeight for variable fonts.
            fontWeight: 600,
            display: "flex",
            maxWidth: "90%",
          }}
        >
          Modern furniture, handcrafted to last.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#7a6f5e",
            marginTop: 28,
            display: "flex",
          }}
        >
          Sofas · Bedrooms · Tables &amp; Chairs · Tbilisi
        </div>
      </div>
    ),
    { ...size }
  );
}

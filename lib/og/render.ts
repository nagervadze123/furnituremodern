// Thin wrapper around next/og ImageResponse so every route handler
// stays a one-liner. Loads fonts, applies the canonical cache headers,
// and lets the caller focus on picking the right JSX template.

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

import { OG_CACHE_HEADERS, type OgDimensions } from "./dimensions";
import { loadOgFonts } from "./fonts";

export async function renderOgResponse(
  jsx: ReactElement,
  size: OgDimensions
): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(jsx, {
    width: size.width,
    height: size.height,
    fonts: fonts.length > 0 ? fonts : undefined,
    headers: { ...OG_CACHE_HEADERS },
  });
}

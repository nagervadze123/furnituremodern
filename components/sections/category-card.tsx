// Card used in the home-page "Our categories" grid. Each card links to
// one of the four category pages. Server component.

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";

type Props = {
  href: string;
  name: string;
  tagline: string;
  imageUrl: string;
  imageAlt: string;
};

export function CategoryCard({ href, name, tagline, imageUrl, imageAlt }: Props) {
  return (
    <Link
      href={href}
      // min-w-0 ensures the card never forces its grid column wider
      // than the viewport even with the longest Georgian category name.
      className="group relative block min-w-0 overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* aspect-[4/5] is the per-card layout contract — when real
          category photography lands, the grid stays fixed regardless
          of source dimensions. */}
      <div className="relative aspect-[4/5]">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          placeholder="blur"
          blurDataURL={BRAND_PORTRAIT_BLUR}
          // Hover-scale is decorative; `motion-safe` skips it for
          // reduced-motion users and avoids a sticky scaled state on
          // touch where :hover stays after a tap.
          className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
        />
        <div
          // Soft gradient so the headline sits readable on any image.
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        />
      </div>
      {/* gap-3 + flex-shrink rules let the icon stay flush right while
          the name+tagline column wraps. min-w-0 on the inner column is
          what actually allows it to shrink and wrap. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-5">
        <div className="min-w-0">
          <h3 className="text-balance font-display text-lg font-semibold tracking-tight break-words sm:text-xl">
            {name}
          </h3>
          <p className="mt-1 text-sm text-white/85 break-words">{tagline}</p>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

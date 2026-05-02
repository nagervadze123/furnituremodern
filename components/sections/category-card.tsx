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
      className="group relative block overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/5]">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          placeholder="blur"
          blurDataURL={BRAND_PORTRAIT_BLUR}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          // Soft gradient so the headline sits readable on any image.
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-tight">
            {name}
          </h3>
          <p className="mt-1 text-sm text-white/85">{tagline}</p>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

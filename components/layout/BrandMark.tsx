// Brand mark — monogram tile + name text. Used in the header and the
// footer so both surfaces present an identical brand identity. Server
// component; pure markup. Reads `siteConfig.brand.logoMonogram` and
// (optionally) `logoSvgPath`.

import Image from "next/image";

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type Props = {
  /** Override default rendering. "full" = monogram + name (default), "monogram" = monogram only. */
  variant?: "full" | "monogram";
  /** Visual size of the monogram tile. */
  size?: "sm" | "md";
  /** Extra classes for the outer flex wrapper. */
  className?: string;
  /** Class applied to the brand-name text span. Lets the caller invert
      colours when rendered over a dark hero. */
  nameClassName?: string;
  /** Class applied to the monogram tile. */
  tileClassName?: string;
};

export function BrandMark({
  variant = "full",
  size = "md",
  className,
  nameClassName,
  tileClassName,
}: Props) {
  const logoSvg = siteConfig.brand.logoSvgPath;
  const tileSize =
    size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base md:h-10 md:w-10";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-foreground/10 bg-foreground font-display font-semibold tracking-tight text-background shadow-sm",
          tileSize,
          tileClassName
        )}
      >
        {logoSvg ? (
          <Image
            src={logoSvg}
            alt=""
            width={28}
            height={28}
            className="h-[70%] w-[70%] object-contain"
            priority={false}
          />
        ) : (
          siteConfig.brand.logoMonogram
        )}
      </span>
      {variant === "full" ? (
        <span
          className={cn(
            "min-w-0 truncate font-display text-base font-semibold tracking-tight md:text-lg",
            nameClassName
          )}
        >
          {siteConfig.name}
        </span>
      ) : null}
    </span>
  );
}

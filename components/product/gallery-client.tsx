"use client";

// Interactive gallery island. Owns:
//   • active-index state for the main image,
//   • lightbox open/close + keyboard navigation,
//   • focus management (restore on close to the triggering thumbnail),
//   • prefers-reduced-motion handling — skip the fade transition.
//
// Every visible image goes through next/image so AVIF/WebP delivery,
// blur placeholders, and the configured remotePatterns hold. The first
// (primary) image is marked priority so the LCP candidate is the one
// next/image preloads.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import type { DataProductImage } from "@/lib/data/types";
import { useReducedMotion } from "@/lib/motion/hooks";
import { DURATIONS } from "@/lib/motion/durations";
import { BRAND_PORTRAIT_BLUR } from "@/lib/perf/blur";
import { cn } from "@/lib/utils";

type Props = {
  images: DataProductImage[];
  locale: Locale;
  productName: string;
};

function altFor(
  img: DataProductImage,
  locale: Locale,
  productName: string,
  index: number
): string {
  const explicit = img.alt[locale];
  if (explicit && explicit.trim().length > 0) return explicit;
  return `${productName} — ${index + 1}`;
}

export function GalleryClient({ images, locale, productName }: Props) {
  const t = useTranslations("gallery");
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const lastFocused = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lightboxId = useId();

  const goTo = useCallback(
    (idx: number) => {
      const next = ((idx % images.length) + images.length) % images.length;
      setActiveIndex(next);
    },
    [images.length]
  );

  const openLightbox = useCallback((triggeringEl: HTMLElement | null) => {
    lastFocused.current = triggeringEl;
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Lightbox keyboard nav + focus restoration + focus trap.
  useEffect(() => {
    if (!lightboxOpen) return;

    // Focus the close button on open so screen readers + keyboard
    // users land on a predictable control.
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(activeIndex + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(activeIndex - 1);
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap inside the dialog. Querying the document each Tab
      // press keeps the trap correct as buttons mount/unmount when the
      // user moves between the first and last image.
      const dialog = document.getElementById(lightboxId);
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href]:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen, activeIndex, goTo, closeLightbox, lightboxId]);

  // Restore focus when the lightbox closes.
  useEffect(() => {
    if (!lightboxOpen && lastFocused.current) {
      // Defer until after the dialog unmounts so the browser doesn't
      // trip on a focus call landing on a still-aria-hidden element.
      const t = lastFocused.current;
      queueMicrotask(() => t.focus());
    }
  }, [lightboxOpen]);

  // Body scroll lock while the lightbox is open. Restore the previous
  // overflow value so we don't trample a scroll-locked parent.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  const transitionMs = reduced ? 0 : DURATIONS.base;
  const fadeStyle = { transitionDuration: `${transitionMs}ms` };

  return (
    <div
      role="region"
      aria-label={t("region_label")}
      className="flex flex-col gap-4"
    >
      {/* Main image — clickable to open lightbox. The button wrapper
          keeps semantics correct (clickable region with a label) without
          stealing the image's role from screen readers. */}
      <button
        type="button"
        onClick={(e) => openLightbox(e.currentTarget)}
        aria-label={t("open_full_view")}
        aria-haspopup="dialog"
        aria-expanded={lightboxOpen}
        aria-controls={lightboxId}
        className="group relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {images.map((img, idx) => (
          <Image
            key={`${img.url}-${idx}`}
            src={img.url}
            alt={altFor(img, locale, productName, idx)}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority={idx === 0}
            placeholder="blur"
            blurDataURL={BRAND_PORTRAIT_BLUR}
            className={cn(
              "object-cover transition-opacity ease-out",
              idx === activeIndex ? "opacity-100" : "opacity-0",
              "group-hover:scale-[1.01] group-hover:transition-transform"
            )}
            style={fadeStyle}
          />
        ))}
      </button>

      {/* Thumbnail strip — horizontal, scrollable. Hidden when the
          product has only one image (nothing to switch to). */}
      {images.length > 1 ? (
        <ul
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
          role="list"
        >
          {images.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li key={`thumb-${img.url}-${idx}`} className="shrink-0">
                <button
                  type="button"
                  ref={(el) => {
                    thumbRefs.current[idx] = el;
                  }}
                  onClick={() => goTo(idx)}
                  aria-label={t("thumbnail_label", {
                    n: idx + 1,
                    total: images.length,
                  })}
                  aria-pressed={isActive}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-md border-2 transition-colors md:size-20",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive
                      ? "border-foreground"
                      : "border-transparent hover:border-foreground/40"
                  )}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="80px"
                    placeholder="blur"
                    blurDataURL={BRAND_PORTRAIT_BLUR}
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {lightboxOpen ? (
        <Lightbox
          id={lightboxId}
          images={images}
          activeIndex={activeIndex}
          locale={locale}
          productName={productName}
          onClose={closeLightbox}
          onPrev={() => goTo(activeIndex - 1)}
          onNext={() => goTo(activeIndex + 1)}
          closeBtnRef={closeBtnRef}
          reducedMotion={reduced}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox dialog
// ---------------------------------------------------------------------------
type LightboxProps = {
  id: string;
  images: DataProductImage[];
  activeIndex: number;
  locale: Locale;
  productName: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  reducedMotion: boolean;
};

function Lightbox({
  id,
  images,
  activeIndex,
  locale,
  productName,
  onClose,
  onPrev,
  onNext,
  closeBtnRef,
  reducedMotion,
}: LightboxProps) {
  const t = useTranslations("gallery");
  const current = images[activeIndex];
  if (!current) return null;

  const transitionMs = reducedMotion ? 0 : DURATIONS.base;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={t("lightbox_title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4 sm:p-8"
      onClick={(e) => {
        // Backdrop click closes; clicks on inner controls bubble up
        // and we filter via target===currentTarget.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        ref={closeBtnRef}
        onClick={onClose}
        aria-label={t("close_label")}
        className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X aria-hidden className="size-5" />
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={onPrev}
            aria-label={t("previous_label")}
            className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={t("next_label")}
            className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </>
      ) : null}

      {/* Letterboxed full-view image. We use `object-contain` so the
          image's natural aspect is preserved against the viewport. */}
      <div
        className="relative size-full max-w-5xl"
        style={{ transitionDuration: `${transitionMs}ms` }}
      >
        <Image
          key={`lightbox-${current.url}`}
          src={current.url}
          alt={altFor(current, locale, productName, activeIndex)}
          fill
          sizes="100vw"
          priority
          placeholder="blur"
          blurDataURL={BRAND_PORTRAIT_BLUR}
          className="object-contain"
        />
      </div>

      {images.length > 1 ? (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-sm tabular-nums text-foreground">
          {activeIndex + 1} {t("of")} {images.length}
        </p>
      ) : null}
    </div>
  );
}

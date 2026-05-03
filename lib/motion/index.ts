// Barrel for the motion primitive layer. Importing data tokens
// (DURATIONS, EASINGS, variants) is server-safe; importing from
// "./components" or "./hooks" pulls a "use client" directive so it's
// only valid from a client component.

export { DURATIONS, seconds } from "./durations";
export type { DurationName } from "./durations";

export { EASINGS } from "./easings";
export type { EasingName } from "./easings";

export {
  fadeIn,
  slideUp,
  slideUpStagger,
  scaleIn,
  imageReveal,
} from "./variants";
export type { CSSVariant } from "./variants";

export {
  useReducedMotion,
  useInViewOnce,
  useScrollProgress,
} from "./hooks";

export { Reveal, RevealStagger, Parallax } from "./components";
export type { RevealVariantName } from "./components";

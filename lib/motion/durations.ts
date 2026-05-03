// Motion duration tokens — milliseconds. Components reference these by
// name (DURATIONS.fast, DURATIONS.base) rather than raw numbers so the
// system stays consistent and a future tuning pass adjusts one place.
//
// The scale is logarithmic-ish so each step reads as a category, not a
// fine gradient: fast (hover/focus feedback), base (most UI motion),
// slow (panel open/close), slower (hero reveal), lazy (decorative).

export const DURATIONS = {
  fast: 150,
  base: 250,
  slow: 400,
  slower: 600,
  lazy: 800,
} as const;

export type DurationName = keyof typeof DURATIONS;

/** Convert a named duration to a seconds float (framer-motion expects seconds). */
export const seconds = (name: DurationName): number => DURATIONS[name] / 1000;

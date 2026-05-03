// Motion easing tokens. Cubic-bezier 4-tuples for the three categories
// of UI motion (entering, exiting, emphasized) plus a spring config.
// Names map onto the four roles described in Material's motion system,
// kept generic so the design language can evolve without renaming the
// tokens.
//
// CSS-only consumers translate the cubic-bezier tuples to a CSS
// cubic-bezier() string at the point of use. The `spring` entry stays
// as configuration metadata — useful for any future motion library
// migration that wants spring physics, and harmless to keep around.

type Cubic = readonly [number, number, number, number];

type SpringConfig = {
  type: "spring";
  stiffness: number;
  damping: number;
};

export const EASINGS = {
  /** Default UI motion — quick start, gentle settle. */
  standard: [0.4, 0, 0.2, 1] as Cubic,
  /** Elements entering the scene — slow start, snap to rest. */
  enter: [0, 0, 0.2, 1] as Cubic,
  /** Elements leaving the scene — quick start, slow end. */
  exit: [0.4, 0, 1, 1] as Cubic,
  /** Emphasized motion (hero reveals) — accelerated start, soft settle. */
  emphasis: [0.4, 0, 0, 1] as Cubic,
  /** Spring metadata. Not consumed by the CSS-only motion layer; left
      in place as configuration so a future migration to a spring-aware
      library has a canonical place to read the tuning from. */
  spring: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } as const satisfies SpringConfig,
} as const;

export type EasingName = keyof typeof EASINGS;

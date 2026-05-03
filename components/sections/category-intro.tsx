// Short intro block at the top of every category page. Renders the
// category name as the H1 and an 80–120 word paragraph below it.
// Server component.

type Props = {
  title: string;
  intro: string;
};

export function CategoryIntro({ title, intro }: Props) {
  return (
    <header className="mx-auto max-w-3xl px-4 pb-10 pt-8 text-center md:px-6 md:pt-12">
      {/* Headline scales from text-3xl on small phones to text-5xl on
          desktop. `break-words` covers the Georgian compound-noun case
          on a 360px viewport. */}
      <h1 className="text-balance font-display text-3xl font-semibold tracking-tight break-words text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
        {intro}
      </p>
    </header>
  );
}

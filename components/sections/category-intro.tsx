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
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
        {intro}
      </p>
    </header>
  );
}

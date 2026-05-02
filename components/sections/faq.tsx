// Accessible FAQ section using shadcn's Accordion (Radix under the hood).
// Client component — Accordion needs interactivity. We pass the entries
// in as a prop instead of importing in this file so the parent (a server
// component) can fetch the localized strings.

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Item = { question: string; answer: string };

type Props = {
  title: string;
  items: Item[];
};

export function Faq({ title, items }: Props) {
  return (
    <section id="faq" className="px-4 py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h2>
        {/* base-ui Accordion is single-open by default and items collapse
            on a second click — no need for type/collapsible props.
            The `fm-faq-answer` class is the css selector our FAQPage
            SpeakableSpecification points at, so smart speakers/assistants
            read out the answer text. */}
        <Accordion className="mt-8">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium md:text-lg">
                {item.question}
              </AccordionTrigger>
              <AccordionContent
                className="fm-faq-answer text-base leading-relaxed text-muted-foreground"
              >
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

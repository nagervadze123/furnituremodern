// Renders a <script type="application/ld+json"> tag with the given
// schema.org data. Server component — no hydration cost.
//
// Why dangerouslySetInnerHTML and not JSON.stringify directly inside <script>?
// React would HTML-encode the JSON if we used a regular text child, which
// breaks the parser. dangerouslySetInnerHTML emits the raw string.

type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
  // Optional id, useful when you want to target a script tag from tests.
  id?: string;
  // Per-request CSP nonce. Required when strict CSP is active in
  // production; passed through from the layout that already read it
  // from the x-nonce request header.
  nonce?: string;
};

export function JsonLd({ data, id, nonce }: Props) {
  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      // We control the input, so this is safe; no untrusted strings reach here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

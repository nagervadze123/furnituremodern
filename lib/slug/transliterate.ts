// lib/slug/transliterate.ts
//
// Georgian → ASCII slug transliteration based on the BGN/PCGN 1981
// romanization scheme, adapted for URL slugs:
//   - drop the apostrophes BGN/PCGN uses to mark ejectives
//     (k', t', p', q', ts', ch') because they're URL-hostile
//   - lowercase everything
//   - collapse non-alphanumeric runs to single hyphens
//   - trim leading/trailing hyphens
//   - cap length at 80 chars, then re-trim a trailing hyphen if the
//     cap split the slug mid-word
//
// Pure function — works in Edge runtime, browser, and Node. No I/O.

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: "a",
  ბ: "b",
  გ: "g",
  დ: "d",
  ე: "e",
  ვ: "v",
  ზ: "z",
  თ: "t",
  ი: "i",
  კ: "k", // BGN/PCGN: k' — apostrophe dropped for slugs
  ლ: "l",
  მ: "m",
  ნ: "n",
  ო: "o",
  პ: "p", // BGN/PCGN: p' — apostrophe dropped
  ჟ: "zh",
  რ: "r",
  ს: "s",
  ტ: "t", // BGN/PCGN: t' — apostrophe dropped
  უ: "u",
  ფ: "p",
  ქ: "k",
  ღ: "gh",
  ყ: "q", // BGN/PCGN: q' — apostrophe dropped
  შ: "sh",
  ჩ: "ch",
  ც: "ts",
  ძ: "dz",
  წ: "ts", // BGN/PCGN: ts' — apostrophe dropped (collides with ც, OK for slugs)
  ჭ: "ch", // BGN/PCGN: ch' — apostrophe dropped (collides with ჩ, OK for slugs)
  ხ: "kh",
  ჯ: "j",
  ჰ: "h",
};

const MAX_SLUG_LENGTH = 80;

export function transliterate(input: string): string {
  if (!input) return "";

  // Pass 1: walk character-by-character, mapping Georgian letters to
  // Latin and dropping anything that isn't ASCII alphanumeric or a
  // separator we can later normalize.
  let buffer = "";
  for (const char of input.toLowerCase()) {
    const mapped = GEORGIAN_TO_LATIN[char];
    if (mapped !== undefined) {
      buffer += mapped;
    } else if (/[a-z0-9]/.test(char)) {
      buffer += char;
    } else {
      buffer += "-";
    }
  }

  // Pass 2: collapse runs of hyphens and trim.
  buffer = buffer.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  // Pass 3: enforce the 80-char cap, then re-trim a trailing hyphen
  // in case the cap landed mid-word.
  if (buffer.length > MAX_SLUG_LENGTH) {
    buffer = buffer.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }

  return buffer;
}

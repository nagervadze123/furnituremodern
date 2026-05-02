// Georgian → ASCII slug transliteration based on the BGN/PCGN 1981
// romanization scheme, adapted for URL slugs:
//   - decompose accented Latin via NFD and drop combining marks so
//     "café" → "cafe" and "naïve" → "naive" before mapping
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

export const MAX_SLUG_LENGTH = 80;

export function transliterate(input: string): string {
  if (!input) return "";

  // NFD splits "é" into "e" + combining acute; \p{M} matches the mark.
  const stripped = input.normalize("NFD").replace(/\p{M}/gu, "");

  let buffer = "";
  for (const char of stripped.toLowerCase()) {
    const mapped = GEORGIAN_TO_LATIN[char];
    if (mapped !== undefined) {
      buffer += mapped;
    } else if (/[a-z0-9]/.test(char)) {
      buffer += char;
    } else {
      buffer += "-";
    }
  }

  buffer = buffer.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (buffer.length > MAX_SLUG_LENGTH) {
    buffer = buffer.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  return buffer;
}

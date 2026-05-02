// Serves the IndexNow key file at /indexnow.txt.
//
// The IndexNow protocol allows the key file to live anywhere on the
// host as long as the submission payload includes its URL via the
// `keyLocation` field — see lib/seo/indexnow.ts. Serving from a
// fixed path means we don't have to dynamically route /<key>.txt and
// fight with the [locale] segment.
//
// 404s when INDEXNOW_KEY is unset, so a misconfigured deploy can't
// silently advertise a key that doesn't match its env.

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET(): Response {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  if (!key) {
    return new Response("IndexNow not configured", { status: 404 });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

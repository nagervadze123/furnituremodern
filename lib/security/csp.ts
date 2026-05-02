// Builds the Content-Security-Policy header string used by proxy.ts.
//
// Two modes: development (includes 'unsafe-eval' on script-src because
// React's dev runtime evaluates strings at runtime to reconstruct
// server-side error stacks; without this, the dev console fills with CSP
// errors about the eval directive being violated) and production
// (nonce-based strict-dynamic — no 'unsafe-eval', no 'unsafe-inline' on
// script-src).
//
// connect-src is computed from the configured Supabase origin so the
// browser client can hit auth/REST/Realtime; we add the wss:// peer for
// Realtime websockets.

type BuildCspArgs = {
  nonce: string;
  isDev: boolean;
  supabaseOrigin: string; // empty string when Supabase isn't configured
};

export function buildCsp({ nonce, isDev, supabaseOrigin }: BuildCspArgs): string {
  const connectSrc = ["'self'"];
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin.replace(/^https:/, "wss:"));
  }

  // 'strict-dynamic' lets framework-loaded scripts load their own
  // dependencies without requiring every CDN host to be allow-listed.
  // Required because Next.js's runtime loader chains additional bundles.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  // Style-src stays 'unsafe-inline' even in production: Tailwind v4 emits
  // a static stylesheet but Next.js framework code occasionally injects
  // small inline styles that aren't worth the breakage risk to nonce.
  const styleSrc = "'self' 'unsafe-inline'";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Response headers for every page (Engineering Library H-14, A-12, Q-02).
 *
 * The content security policy keeps `'unsafe-inline'` for scripts and styles: the pages are
 * static and work offline, so a per-request nonce is not possible, and Next.js and the theme
 * script need inline code. Everything else is closed: no frames, no plugins, same-origin
 * requests only.
 */

const ONE_YEAR_SECONDS = 31_536_000;

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

export function securityHeaders(isProduction: boolean): HeaderRule[] {
  const common = [
    { key: "Strict-Transport-Security", value: `max-age=${ONE_YEAR_SECONDS}; includeSubDomains` },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
  // The development server needs eval for its error overlay, so the policy is for production only.
  const pageHeaders = isProduction
    ? [...common, { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }]
    : common;

  return [
    { source: "/:path*", headers: pageHeaders },
    // The service worker file must never be served from a stale cache, or updates never arrive.
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
  ];
}

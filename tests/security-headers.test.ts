import { describe, expect, it } from "vitest";

import { CONTENT_SECURITY_POLICY, securityHeaders } from "@/lib/security-headers";

function headerValue(isProduction: boolean, source: string, key: string): string | undefined {
  const rule = securityHeaders(isProduction).find((r) => r.source === source);
  return rule?.headers.find((h) => h.key === key)?.value;
}

describe("security headers", () => {
  it("sends the basic protections on every page", () => {
    const page = "/:path*";
    expect(headerValue(true, page, "X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue(true, page, "X-Frame-Options")).toBe("DENY");
    expect(headerValue(true, page, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerValue(true, page, "Strict-Transport-Security")).toMatch(/max-age=31536000/);
    expect(headerValue(true, page, "Permissions-Policy")).toMatch(/camera=\(\)/);
  });

  it("closes frames, plugins and the base tag in the policy", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
  });

  it("allows no other origin to load scripts or connect", () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:\/\//);
    expect(CONTENT_SECURITY_POLICY).not.toContain("*");
  });

  it("applies the policy in production only", () => {
    expect(headerValue(true, "/:path*", "Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(headerValue(false, "/:path*", "Content-Security-Policy")).toBeUndefined();
  });

  it("never lets the service worker file be cached", () => {
    expect(headerValue(true, "/sw.js", "Cache-Control")).toBe("no-cache");
  });
});

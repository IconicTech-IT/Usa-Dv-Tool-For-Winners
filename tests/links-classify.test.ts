import { describe, expect, it } from "vitest";

import { classifyFailure, classifyStatus } from "@/lib/links/classify";

describe("classifyStatus", () => {
  it("calls an answer that arrived ok", () => {
    for (const status of [200, 204, 301, 302]) expect(classifyStatus(status), String(status)).toBe("ok");
  });

  it("calls a site that refuses robots, or is busy, blocked: a person must look", () => {
    for (const status of [400, 401, 403, 405, 429, 503, 999])
      expect(classifyStatus(status), String(status)).toBe("blocked");
  });

  it("calls a page that is gone or a server fault broken", () => {
    for (const status of [404, 410, 500, 502]) expect(classifyStatus(status), String(status)).toBe("broken");
  });
});

describe("classifyFailure", () => {
  it("calls an address that does not exist broken", () => {
    expect(classifyFailure(new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } }))).toBe("broken");
    expect(classifyFailure(new TypeError("fetch failed", { cause: { code: "CERT_HAS_EXPIRED" } }))).toBe(
      "broken",
    );
  });

  it("calls a timeout or a closed connection blocked, not broken", () => {
    expect(classifyFailure(new TypeError("fetch failed", { cause: { code: "ECONNRESET" } }))).toBe("blocked");
    expect(classifyFailure(new DOMException("timed out", "TimeoutError"))).toBe("blocked");
    expect(classifyFailure(null)).toBe("blocked");
  });
});

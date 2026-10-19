import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { pageMetadata } from "@/lib/seo";

describe("page metadata", () => {
  it("points the share card at the image of the page language", () => {
    const meta = pageMetadata({ locale: "en", path: "/fees", title: "T", description: "D" });
    expect(meta.openGraph?.images).toEqual([{ url: "/og-en.png", width: 1200, height: 630, alt: "T" }]);
    expect(meta.twitter?.images).toEqual(["/og-en.png"]);
  });

  it("gives each page a canonical address and both language alternates", () => {
    const meta = pageMetadata({ locale: "ar", path: "/fees", title: "T", description: "D" });
    expect(meta.alternates?.canonical).toBe("/ar/fees");
    expect(meta.alternates?.languages).toMatchObject({
      ar: "/ar/fees",
      en: "/en/fees",
      "x-default": "/ar/fees",
    });
  });
});

describe("share cards", () => {
  it.each(["ar", "en"])("public/og-%s.png is a 1200 by 630 PNG", (locale) => {
    const file = readFileSync(join(process.cwd(), "public", `og-${locale}.png`));
    expect(file.subarray(1, 4).toString("latin1")).toBe("PNG");
    // The size is stored right after the PNG signature and the "IHDR" tag.
    expect(file.readUInt32BE(16)).toBe(1200);
    expect(file.readUInt32BE(20)).toBe(630);
  });
});

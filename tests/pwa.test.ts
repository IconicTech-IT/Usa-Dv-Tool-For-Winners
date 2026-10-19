import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { routing } from "@/i18n/routing";
import { PAGE_PATHS } from "@/lib/routes";

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const worker = read("public", "sw.js");

describe("web app manifest", () => {
  const m = manifest();

  it("has the fields an installable app needs", () => {
    expect(m.name).toBe("DV Compass");
    expect(m.short_name).toBeTruthy();
    expect(m.id).toBe(`/${routing.defaultLocale}`);
    expect(m.start_url).toBe(`/${routing.defaultLocale}`);
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.lang).toBe("ar");
    expect(m.dir).toBe("rtl");
    expect(m.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("has icons of 192 and 512 pixels and one maskable", () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("points every icon at a file the icon route draws", () => {
    const route = read("app", "icons", "[name]", "route.tsx");
    for (const icon of manifest().icons ?? []) {
      const name = icon.src.replace("/icons/", "");
      expect(route, name).toContain(`"${name}"`);
    }
    expect(route).toContain('"apple-touch-icon.png"');
  });
});

describe("service worker", () => {
  it("saves every page of the site, in both languages, and the offline page", () => {
    for (const path of PAGE_PATHS) expect(worker, `path "${path}"`).toContain(`"${path}"`);
    expect(worker).toContain('"/offline"');
    for (const locale of routing.locales) expect(worker).toContain(`"${locale}"`);
  });

  it("waits for the visitor before it takes over: skipWaiting only on his message", () => {
    const uses = worker.match(/skipWaiting\(\)/g) ?? [];
    expect(uses).toHaveLength(1);
    expect(worker).toMatch(/addEventListener\("message"[\s\S]*?SKIP_WAITING[\s\S]*?skipWaiting\(\)/);
  });

  it("only handles same-origin GET requests, so nothing personal or posted is cached", () => {
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain("url.origin !== self.location.origin");
    expect(worker).not.toMatch(/\/api\b/);
  });

  it("drops the caches of older versions when a new one takes over", () => {
    expect(worker).toMatch(/key !== VERSION/);
  });
});

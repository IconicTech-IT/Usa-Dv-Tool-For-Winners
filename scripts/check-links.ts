/**
 * Weekly link check: opens every outside link of the site and says which ones answer.
 *
 *   npm run check-links
 *
 * ok      the page answered.
 * blocked the site refuses robots or was too slow: open it in a browser by hand.
 * broken  the page is gone or the address does not exist: fix the link.
 *
 * The exit code is 1 only when something is broken. A blocked link is not a failure, but it is
 * not proof either: `linksLastChecked` in content/guide-links.json changes only when a person has
 * opened every link in a real browser.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyFailure, classifyStatus, type LinkVerdict } from "../lib/links/classify.ts";

const CONTENT = join(process.cwd(), "content");
const TIMEOUT_MS = 20_000;
const PARALLEL = 6;
const BROWSER_LIKE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

/** Every "https://" text in a content file, wherever it sits. */
function urlsIn(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("https://")) found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) urlsIn(item, found);
  } else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) urlsIn(item, found);
  }
}

function collectUrls(): string[] {
  const files = [
    join(CONTENT, "guide-links.json"),
    join(CONTENT, "official-links.json"),
    join(CONTENT, "item-notes.json"),
    ...readdirSync(join(CONTENT, "pages"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => join(CONTENT, "pages", name)),
  ];
  const found = new Set<string>();
  for (const file of files) urlsIn(JSON.parse(readFileSync(file, "utf8")), found);
  return [...found].sort();
}

interface Result {
  url: string;
  verdict: LinkVerdict;
  detail: string;
}

async function check(url: string): Promise<Result> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": BROWSER_LIKE, accept: "text/html,application/pdf,*/*" },
    });
    await response.body?.cancel();
    return { url, verdict: classifyStatus(response.status), detail: String(response.status) };
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return { url, verdict: classifyFailure(error), detail: cause?.code ?? "no answer" };
  }
}

async function runAll(urls: string[]): Promise<Result[]> {
  const results: Result[] = [];
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next];
      next += 1;
      if (url) results.push(await check(url));
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}

const results = await runAll(collectUrls());
const lines = (verdict: LinkVerdict) => results.filter((r) => r.verdict === verdict);
const report = (title: string, rows: Result[]) =>
  rows.length === 0
    ? ""
    : `\n${title} (${rows.length})\n${rows.map((r) => `  ${r.detail.padEnd(18)} ${r.url}`).join("\n")}\n`;

process.stdout.write(
  `${report("BROKEN: fix these", lines("broken"))}${report("BLOCKED: open these in a browser by hand", lines("blocked"))}\n` +
    `${lines("ok").length} ok, ${lines("blocked").length} blocked, ${lines("broken").length} broken, ${results.length} links\n`,
);
process.exitCode = lines("broken").length > 0 ? 1 : 0;

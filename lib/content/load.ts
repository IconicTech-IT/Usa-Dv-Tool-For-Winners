import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import {
  Checklist,
  Eligibility,
  Metro,
  State,
  STATUSES,
  VERIFY_PERIODS,
  type Status,
} from "@/content/_schema";

export const CONTENT_DIR = join(process.cwd(), "content");

function readJSON(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function listJSON(dir: string): string[] {
  return readdirSync(join(CONTENT_DIR, dir))
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => join(CONTENT_DIR, dir, f));
}

/** بيقرا ويتحقق. أي ملف مكسور بيرمي error برسالة فيها اسم الملف والمسار. */
function parseOrThrow<T>(schema: z.ZodType<T>, path: string): T {
  const result = schema.safeParse(readJSON(path));
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`محتوى مش صالح — ${path}\n${issues}`);
  }
  return result.data;
}

export function loadMetros() {
  return listJSON("metros").map((p) => parseOrThrow(Metro, p));
}

export function loadStates() {
  return listJSON("states").map((p) => parseOrThrow(State, p));
}

export function loadChecklists() {
  return listJSON("checklists").map((p) => parseOrThrow(Checklist, p));
}

export function loadEligibility() {
  return parseOrThrow(Eligibility, join(CONTENT_DIR, "eligibility.json"));
}

/* ------------------------------------------------------------------ */

export type StatusCounts = Record<Status, number>;

export interface FieldRef {
  file: string;
  path: string;
  field: string;
  status: Status;
  note?: string;
  verifyIn?: keyof typeof VERIFY_PERIODS;
  lastVerified: string;
}

function isField(o: unknown): o is Record<string, unknown> {
  return (
    typeof o === "object" &&
    o !== null &&
    "status" in o &&
    "sources" in o &&
    "lastVerified" in o
  );
}

/** بيمشي على كل ملفات المحتوى ويجمع كل حقل بحالته. أساس verify-content. */
export function collectFields(): FieldRef[] {
  const out: FieldRef[] = [];

  const walk = (node: unknown, file: string, path: string, key: string) => {
    if (isField(node)) {
      const status = node["status"] as Status;
      if ((STATUSES as readonly string[]).includes(status)) {
        out.push({
          file,
          path: path || key,
          field: key,
          status,
          note: typeof node["note"] === "string" ? node["note"] : undefined,
          verifyIn: node["verifyIn"] as FieldRef["verifyIn"],
          lastVerified: String(node["lastVerified"]),
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, file, `${path}[${i}]`, key));
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [k, v] of Object.entries(node)) {
        walk(v, file, path ? `${path}.${k}` : k, k);
      }
    }
  };

  const files = [
    ...listJSON("metros"),
    ...listJSON("states"),
    ...listJSON("jobs"),
    ...listJSON("checklists"),
    join(CONTENT_DIR, "fees.json"),
    join(CONTENT_DIR, "steps.json"),
    join(CONTENT_DIR, "documents.json"),
    join(CONTENT_DIR, "eligibility.json"),
    join(CONTENT_DIR, "job-presets.json"),
  ];

  for (const file of files) {
    const rel = file.slice(CONTENT_DIR.length + 1);
    const data = readJSON(file) as Record<string, unknown>;

    // بنود الشيك ليست فيها الحالة على البند نفسه مش على حقل جواه
    if (rel.startsWith("checklists/") && Array.isArray(data["items"])) {
      for (const item of data["items"] as Record<string, unknown>[]) {
        out.push({
          file: rel,
          path: `items.${String(item["id"])}`,
          field: "item",
          status: item["status"] as Status,
          note:
            typeof item["verifyNote"] === "string" ? item["verifyNote"] : undefined,
          verifyIn: item["verifyIn"] as FieldRef["verifyIn"],
          lastVerified: String(item["lastVerified"]),
        });
      }
      continue;
    }

    walk(data, rel, "", "");
  }

  return out;
}

/**
 * كل نص عربي جاهز والإنجليزي بتاعه فاضي.
 * اللغتين متساويتين في الموقع، فالنقص ده لازم يفضل مرصود.
 */
export function collectMissingEnglish(): string[] {
  const out: string[] = [];

  const walk = (node: unknown, file: string) => {
    if (Array.isArray(node)) {
      node.forEach((v) => walk(v, file));
      return;
    }
    if (typeof node !== "object" || node === null) return;

    const o = node as Record<string, unknown>;
    if (typeof o["ar"] === "string" && typeof o["en"] === "string") {
      if (o["ar"].trim() !== "" && o["en"].trim() === "") out.push(file);
      // مبنرجعش هنا — فيه أشكال (زي مصطلحات القاموس) فيها ar/en
      // وجواها كمان حقول مترجمة تانية.
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === "ar" || k === "en") continue;
      walk(v, file);
    }
  };

  for (const file of readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf-8" })) {
    if (!file.endsWith(".json")) continue;
    walk(readJSON(join(CONTENT_DIR, file)), file);
  }

  return out;
}

export function countStatuses(fields: FieldRef[]): StatusCounts {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const f of fields) counts[f.status] += 1;
  return counts;
}

/** الحقول اللي عدّى على آخر مراجعة ليها أكتر من فترة `verifyIn` بتاعتها. */
export function staleFields(fields: FieldRef[], today = new Date()): FieldRef[] {
  return fields.filter((f) => {
    if (!f.verifyIn) return false;
    const days = VERIFY_PERIODS[f.verifyIn];
    const last = new Date(f.lastVerified);
    if (Number.isNaN(last.getTime())) return false;
    const age = (today.getTime() - last.getTime()) / 86_400_000;
    return age > days;
  });
}

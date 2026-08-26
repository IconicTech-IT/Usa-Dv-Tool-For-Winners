import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import {
  ArrivalCosts,
  CarNeedScale,
  Checklist,
  DocumentsFile,
  Eligibility,
  FeesFile,
  GlossaryFile,
  InterviewFile,
  JobFile,
  JobPresetsFile,
  Metro,
  ScamsFile,
  State,
  STATUSES,
  StepsFile,
  TaxBrackets,
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

/**
 * كل ملفات المحتوى اللي فيها حقول بالشكل بتاع `_schema.ts`.
 *
 * ⚠️ أي ملف جديد فيه حقول لازم يتحط هنا. `tax-brackets.json` كان ناقص،
 * فـ١٧ حقل ضريبي فاضي ماكانوش بيظهروا في TODO-VERIFY.md خالص — والتقرير
 * كان بيقرا كإنه كامل وهو مش شايف أهم ملف في الموقع.
 */
function contentFiles(): string[] {
  return [
    ...listJSON("metros"),
    ...listJSON("states"),
    ...listJSON("jobs"),
    ...listJSON("checklists"),
    join(CONTENT_DIR, "fees.json"),
    join(CONTENT_DIR, "tax-brackets.json"),
    join(CONTENT_DIR, "arrival-costs.json"),
    join(CONTENT_DIR, "steps.json"),
    join(CONTENT_DIR, "documents.json"),
    join(CONTENT_DIR, "eligibility.json"),
    join(CONTENT_DIR, "job-presets.json"),
  ];
}

/**
 * أصول المصادر اللي المحتوى بيستشهد بيها فعلًا، مرتبة.
 *
 * ⚠️ صفحة `/sources` كانت بتعرض قايمة مكتوبة بالإيد، فأول ما اتضاف مصدر
 * جديد في `content/` الصفحة فضلت تقول خمس مصادر وهي بقت تمانية. القايمة
 * دلوقتي بتتولد من المحتوى نفسه فمستحيل تتأخر عنه تاني.
 */
export function collectSourceHosts(): string[] {
  const hosts = new Set<string>();

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object" || node === null) return;

    const o = node as Record<string, unknown>;
    if (typeof o["url"] === "string" && typeof o["label"] === "string") {
      try {
        hosts.add(new URL(o["url"]).origin + "/");
      } catch {
        // لينك مكسور — verify-content هو اللي بيمسكه، مش هنا
      }
    }
    for (const v of Object.values(o)) walk(v);
  };

  for (const file of contentFiles()) walk(readJSON(file));

  return [...hosts].sort();
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

  for (const file of contentFiles()) {
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
  return collectMissingText().en;
}

/** النصوص الناقصة في اللغتين، كل واحدة على حدة. */
export function collectMissingText(): { ar: string[]; en: string[] } {
  const out: string[] = [];
  const arMissing: string[] = [];

  const walk = (node: unknown, file: string) => {
    if (Array.isArray(node)) {
      node.forEach((v) => walk(v, file));
      return;
    }
    if (typeof node !== "object" || node === null) return;

    const o = node as Record<string, unknown>;
    if (typeof o["ar"] === "string" && typeof o["en"] === "string") {
      if (o["ar"].trim() !== "" && o["en"].trim() === "") out.push(file);
      if (o["ar"].trim() === "") arMissing.push(file);
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

  return { ar: arMissing, en: out };
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

/* ------------------------------------------------------------------ *
 * باقي المحمّلات
 * ------------------------------------------------------------------ */

export function loadFees() {
  return parseOrThrow(FeesFile, join(CONTENT_DIR, "fees.json")).fees;
}

export function loadSteps() {
  return parseOrThrow(StepsFile, join(CONTENT_DIR, "steps.json")).steps.sort(
    (a, b) => a.order - b.order,
  );
}

export function loadDocuments() {
  return parseOrThrow(DocumentsFile, join(CONTENT_DIR, "documents.json")).documents;
}

export function loadGlossary() {
  return parseOrThrow(GlossaryFile, join(CONTENT_DIR, "glossary.json")).terms;
}

export function loadScams() {
  return parseOrThrow(ScamsFile, join(CONTENT_DIR, "scams.json")).scams;
}

export function loadInterview() {
  return parseOrThrow(InterviewFile, join(CONTENT_DIR, "interview-questions.json"));
}

export function loadJobPresets() {
  return parseOrThrow(JobPresetsFile, join(CONTENT_DIR, "job-presets.json")).presets;
}

export function loadJobs() {
  return listJSON("jobs").map((p) => parseOrThrow(JobFile, p));
}

export function loadTaxTables() {
  return parseOrThrow(TaxBrackets, join(CONTENT_DIR, "tax-brackets.json"));
}

/**
 * البنود المش مربوطة بمدينة. المحرك بيستوردها مباشرة كـJSON عشان يشتغل
 * على المتصفح كمان — والدالة دي هي اللي بتتحقق منها بالschema وقت الbuild.
 */
export function loadArrivalCosts() {
  return parseOrThrow(ArrivalCosts, join(CONTENT_DIR, "arrival-costs.json"));
}

export function loadCarNeedScale() {
  return parseOrThrow(CarNeedScale, join(CONTENT_DIR, "metros/_CAR-NEED-SCALE.json"));
}

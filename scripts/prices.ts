/**
 * الأسعار من ملف واحد تكتب فيه بإيدك.
 *
 *   npm run prices          يقرا data/الأسعار.csv ويكتبه في content/metros/
 *   npm run prices -- --check   يتحقق بس من غير ما يكتب حاجة
 *
 * ليه CSV: عشان يتفتح في إكسل وتكتب فيه زي أي جدول، من غير ما تفتح
 * خمسين ملف JSON ولا تخاف تكسر قوس.
 *
 * ⚠️ **كل سعر هنا نطاق: من · الأرجح · لـ.**
 * الرقم الواحد بيوحي بدقة مش موجودة. الأوضة في نيويورك وسيطها $1,580
 * بس نص الإعلانات بين $1,325 و$1,955 — واللي بيخطط بالوسيط لوحده ممكن
 * يتصدم بفرق ٦٠٠ دولار في الشهر. "الأرجح" هو اللي الخطة بتحسب بيه،
 * و"من/لـ" بيتعرضوا للمستخدم عشان يعرف المدى الحقيقي.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CSV = join(ROOT, "data", "الأسعار.csv");
const METROS = join(ROOT, "content", "metros");
const CHECK_ONLY = process.argv.includes("--check");

/** الأعمدة زي ما هي في الملف بالظبط. */
const COLS = [
  "المدينة",
  "الاسم",
  "أوضة_من",
  "أوضة_الأرجح",
  "أوضة_لـ",
  "شقة_غرفة_من",
  "شقة_غرفة_الأرجح",
  "شقة_غرفة_لـ",
  "شقة_غرفتين_من",
  "شقة_غرفتين_الأرجح",
  "شقة_غرفتين_لـ",
  "فواتير_الشقة_داخلة",
  "أكل_للفرد",
  "الفواتير",
  "تأمين_العربية",
  "اشتراك_المواصلات",
  "مصدر_الأوضة",
  "مصدر_الشقق",
  "مصدر_باقي_الأرقام",
] as const;

type Row = Record<(typeof COLS)[number], string>;

function parseCSV(text: string): Row[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      lines.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    lines.push(row);
  }

  if (lines.length === 0) return [];
  const header = (lines[0] ?? []).map((h) => h.trim());

  // ⚠️ لو حد غيّر اسم عمود أو مسحه، الاستيراد كان هيعدّي ويسيب الحقل فاضي
  // من غير ما يقول. الأحسن يقف ويقول العمود الناقص إيه.
  const missingCols = COLS.filter((c) => !header.includes(c));
  if (missingCols.length) {
    console.error(`\n❌ الملف ناقصه أعمدة: ${missingCols.join(" · ")}`);
    console.error("   رجّع أسماء الأعمدة زي ما هي — الاستيراد بيدوّر عليها بالاسم.\n");
    process.exit(1);
  }

  return lines
    .slice(1)
    .filter((l) => l.some((c) => c.trim() !== ""))
    .map((l) => {
      const o = {} as Row;
      header.forEach((h, i) => {
        (o as Record<string, string>)[h] = (l[i] ?? "").trim();
      });
      return o;
    });
}

const problems: string[] = [];
const num = (s: string): number | null => {
  if (!s || s === "-") return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * بيبني حقل من تلات خانات. بيرجع null لو الخانة الوسطى فاضية —
 * والفاضي معناه "منعرفش" مش صفر.
 */
function field(
  city: string,
  label: string,
  min: string,
  likely: string,
  max: string,
  source: string,
  unit = "USD/month",
) {
  const lo = num(min);
  const mid = num(likely);
  const hi = num(max);

  if (mid === null) {
    if (lo !== null || hi !== null) {
      problems.push(
        `${city} · ${label}: كتبت "من" أو "لـ" من غير "الأرجح" — الخطة بتحسب بالأرجح، فمن غيره الرقم مش هيتحسب.`,
      );
    }
    return {
      value: null,
      status: "NEEDS_VERIFICATION" as const,
      sources: [],
      lastVerified: today(),
      unit,
    };
  }

  if (lo !== null && hi !== null && lo > hi) {
    problems.push(`${city} · ${label}: "من" (${lo}) أكبر من "لـ" (${hi}).`);
  }
  if (lo !== null && lo > mid) {
    problems.push(`${city} · ${label}: "من" (${lo}) أكبر من "الأرجح" (${mid}).`);
  }
  if (hi !== null && hi < mid) {
    problems.push(`${city} · ${label}: "لـ" (${hi}) أقل من "الأرجح" (${mid}).`);
  }
  if (!source) {
    problems.push(
      `${city} · ${label}: مفيش مصدر. كل رقم لازم يقول جه منين — اكتبه في عمود المصدر.`,
    );
  }

  // ⚠️ لو المصدر فيه لينك، بنفصله ونحطه في `sources` كمان مش في النص بس.
  // من غير الخطوة دي صفحة /sources بتقل مصادر — لأنها بتتولد من `sources`
  // مش من `basis`، فالمستخدم بيشوف الشرح بس من غير لينك يفتحه ويتأكد.
  const { label: srcLabel, url } = splitSource(source);

  const out: Record<string, unknown> = {
    value: mid,
    status: "estimated",
    sources: url ? [{ label: srcLabel.slice(0, 120), url }] : [],
    lastVerified: today(),
    unit,
    basis: { ar: srcLabel, en: srcLabel },
    verifyIn: "6-months",
  };
  if (lo !== null && hi !== null) out.range = [lo, hi];
  return out;
}

/** بيشيل اللينك من نص المصدر ويرجّع الاتنين. */
function splitSource(source: string): { label: string; url: string | null } {
  const m = source.match(/https?:\/\/\S+/);
  if (!m) return { label: source.trim(), url: null };
  return {
    label: source.replace(m[0], "").replace(/\s*[·—-]\s*$/, "").trim(),
    url: m[0].replace(/[.,)]+$/, ""),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  if (!existsSync(CSV)) {
    console.error(`مفيش ملف: ${CSV}`);
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(CSV, "utf-8"));
  let written = 0;
  const pending: [string, Record<string, unknown>][] = [];

  for (const r of rows) {
    const slug = r["المدينة"];
    const path = join(METROS, `${slug}.json`);
    if (!existsSync(path)) {
      problems.push(`مفيش مدينة اسمها "${slug}" في content/metros/`);
      continue;
    }

    const j = JSON.parse(readFileSync(path, "utf-8"));
    const srcRoom = r["مصدر_الأوضة"];
    const srcApt = r["مصدر_الشقق"];
    const srcRest = r["مصدر_باقي_الأرقام"];
    const billsIn = /^(نعم|yes|y|1)$/i.test(r["فواتير_الشقة_داخلة"]);

    const room = field(slug, "أوضة", r["أوضة_من"], r["أوضة_الأرجح"], r["أوضة_لـ"], srcRoom);
    const a1 = field(slug, "شقة غرفة", r["شقة_غرفة_من"], r["شقة_غرفة_الأرجح"], r["شقة_غرفة_لـ"], srcApt);
    const a2 = field(slug, "شقة غرفتين", r["شقة_غرفتين_من"], r["شقة_غرفتين_الأرجح"], r["شقة_غرفتين_لـ"], srcApt);

    // ⚠️ الفواتير مينفعش تتحسب مرتين. الschema بيفشل الbuild لو الاتنين
    // اتملوا، فبنمسك الحالة هنا برسالة مفهومة بدل ما الbuild يقع بعدين.
    const utilities = field(slug, "الفواتير", "", r["الفواتير"], "", srcRest);
    if (billsIn) {
      if (a1.value !== null) (a1 as Record<string, unknown>).includesUtilities = true;
      if (a2.value !== null) (a2 as Record<string, unknown>).includesUtilities = true;
      if (utilities.value !== null) {
        problems.push(
          `${slug}: كتبت "نعم" في فواتير_الشقة_داخلة وكتبت رقم في عمود الفواتير كمان — الاتنين مع بعض معناهم إن الفواتير هتتحسب مرتين. اختار واحد.`,
        );
      }
    }

    j.costs.roomRent = room;
    j.costs.apt1br = a1;
    j.costs.apt2br = a2;
    j.costs.utilities = utilities;
    j.costs.groceriesPerAdult = field(slug, "أكل", "", r["أكل_للفرد"], "", srcRest);
    j.costs.carInsurance = field(slug, "تأمين العربية", "", r["تأمين_العربية"], "", srcRest);
    j.car.monthlyTransitPass = field(slug, "المواصلات", "", r["اشتراك_المواصلات"], "", srcRest);

    pending.push([path, j]);
    written++;
  }

  if (problems.length) {
    console.error(`\n❌ ${problems.length} مشكلة — مكتبتش أي حاجة:\n`);
    for (const p of problems) console.error("  · " + p);
    console.error("\nصلّحها في data/الأسعار.csv وشغّل الأمر تاني.\n");
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log(`✅ الملف سليم — ${written} مدينة جاهزة للكتابة.`);
    return;
  }

  for (const [path, j] of pending) {
    writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
  }
  console.log(`✅ اتكتبت ${written} مدينة في content/metros/`);
  console.log("   شغّل npm run verify-content بعدها عشان تتأكد.");
}

main();

/**
 * بيتحقق من كل ملفات المحتوى بـzod، وبيعيد كتابة TODO-VERIFY.md.
 * بيفشل (exit 1) لو أي ملف مكسور — فالـbuild بيقف قبل ما رقم غلط ينزل.
 *
 *   npm run verify-content
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  collectFields,
  collectMissingText,
  countStatuses,
  loadCarNeedScale,
  loadChecklists,
  loadDocuments,
  loadEligibility,
  loadFees,
  loadGlossary,
  loadInterview,
  loadJobPresets,
  loadJobs,
  loadMetros,
  loadScams,
  loadStates,
  loadSteps,
  loadTaxTables,
  staleFields,
  type FieldRef,
} from "@/lib/content/load";

/**
 * ترتيب الأولوية. الحقل اللي أعلى في القايمة دي بيظهر الأول.
 *
 * ⚠️ `carNeed` أولوية أولى مع الإيجار — مش تقدير عادي.
 * نيويورك وشارلوت واضحين، بس الفرق بين ٣ و٤ (بالتيمور، مينيابوليس،
 * بورتلاند، سياتل) تخمين — وده بالظبط الفرق بين "أأجل العربية"
 * و"أشتريها من أول شهر"، يعني آلاف الدولارات في خطة ميزانيتها ضيقة.
 */
const PRIORITY_1: { field: string; where: string; source: string }[] = [
  {
    field: "costs.roomRent",
    where: "كل ملفات metros/",
    source: "إعلانات فعلية للغرف المشتركة — أهم رقم في الموقع كله",
  },
  {
    field: "car.carNeed",
    where: "كل ملفات metros/",
    source:
      "Walk Score + موقع هيئة المواصلات. ركّز على المدن اللي بين ٣ و٤ — الفرق بينهم بيغيّر قرار شرا العربية",
  },
  {
    field: "costs.carInsurance",
    where: "كل ملفات metros/",
    source: "عروض تأمين فعلية لسايق من غير تاريخ قيادة أمريكي",
  },
  {
    field: "car.monthlyTransitPass",
    where: "metros/ (المدن carNeed ≤ 3)",
    source: "موقع هيئة المواصلات في المدينة",
  },
  {
    field: "fees.*",
    where: "fees.json",
    source: "travel.state.gov و uscis.gov — الصفحات الرسمية نفسها",
  },
];

/** المدن اللي الفرق فيها بين ٣ و٤ تخمين ومحتاج حسم. */
const CAR_NEED_BOUNDARY = [
  "baltimore-md",
  "minneapolis-mn",
  "portland-or",
  "seattle-wa",
];

const FIRST_EIGHT = [
  "nyc-ny",
  "jersey-city-nj",
  "chicago-il",
  "philadelphia-pa",
  "houston-tx",
  "dearborn-mi",
  "charlotte-nc",
  "columbus-oh",
];

function groupByFile(fields: FieldRef[]) {
  const map = new Map<string, FieldRef[]>();
  for (const f of fields) {
    const list = map.get(f.file) ?? [];
    list.push(f);
    map.set(f.file, list);
  }
  return map;
}

function main() {
  // ١. التحقق — بيرمي لو أي ملف مكسور
  const metros = loadMetros();
  const states = loadStates();
  const checklists = loadChecklists();
  loadEligibility();
  loadFees();
  loadSteps();
  loadDocuments();
  loadGlossary();
  loadScams();
  loadInterview();
  loadJobPresets();
  loadJobs();
  loadTaxTables();
  loadCarNeedScale();

  // ٢. الإحصاء
  const fields = collectFields();
  const counts = countStatuses(fields);
  const needs = fields.filter((f) => f.status === "NEEDS_VERIFICATION");
  const stale = staleFields(fields);
  const byFile = groupByFile(needs);

  const judgmentFields = fields.filter((f) => f.status === "judgment");
  const missingText = collectMissingText();
  const missingEnglish = missingText.en;

  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  const p = (s = "") => lines.push(s);

  p("# محتاج تأكيد");
  p();
  p(`> الملف ده **بيتولد تلقائي** بـ\`npm run verify-content\`. متعدلوش بإيدك.`);
  p("> أي حقل هنا بيظهر في الموقع كـ\"محتاج تأكيد\" مش كرقم.");
  p("> **متحطش رقم من دماغك عشان تفضّي القايمة.** ناس بتاخد قرارات بفلوسها على الأرقام دي.");
  p();
  p(`**آخر تحديث للملف ده:** ${today}`);
  p();
  p(
    `**الحالة دلوقتي:** ${states.length} ولاية · ${metros.length} مدينة · ` +
      `${checklists.length} شيك ليست — إجمالي ${fields.length} حقل.`,
  );
  p();
  p("| الحالة | العدد | معناها في الواجهة |");
  p("|---|---|---|");
  p(`| \`verified\` | ${counts.verified} | من غير بادج، المصدر في الفوتنوت |`);
  p(`| \`estimated\` | ${counts.estimated} | بادج "تقديري"، والbasis في tooltip |`);
  p(
    `| \`judgment\` | ${counts.judgment} | من غير بادج — بيتعرض كوصف مش كرقم |`,
  );
  p(
    `| \`NEEDS_VERIFICATION\` | ${counts.NEEDS_VERIFICATION} | بادج "محتاج تأكيد"، ومفيش رقم |`,
  );
  p();
  p("---");
  p();

  // أولوية أولى
  p("## 🔴 أولوية أولى — من غيرهم الخطة مبتشتغلش");
  p();
  p("| الحقل | فين | تراجعه منين |");
  p("|---|---|---|");
  for (const row of PRIORITY_1) {
    p(`| \`${row.field}\` | ${row.where} | ${row.source} |`);
  }
  p();
  p(
    `**ابدأ بـ٨ مدن بس** بدل الخمسين: ${FIRST_EIGHT.map((s) => `\`${s}\``).join(" · ")}.`,
  );
  p("دول بيغطوا كل درجات سلم الحاجة للعربية من ١ لـ٥، فالخطة هتشتغل صح من أول يوم.");
  p();
  p(
    `**وفي \`carNeed\` تحديدًا:** المدن اللي بين ٣ و٤ هي اللي محتاجة حسم — ` +
      `${CAR_NEED_BOUNDARY.map((s) => `\`${s}\``).join(" · ")}. ` +
      "الفرق بين ٣ و٤ هو الفرق بين \"أقدر أأجل العربية\" و\"محتاجها من أول شهر\" — " +
      "يعني آلاف الدولارات في خطة حد ميزانيته ضيقة.",
  );
  p();
  p("---");
  p();

  // الأحكام الذاتية
  p("## 🟣 ترتيب ذاتي (`judgment`) — مش محتاج مصدر، محتاج مراجعة رأي");
  p();
  p(
    `${judgmentFields.length} حقل حالتهم \`judgment\`. دي أحكام شخصية مش قياسات — ` +
      "مفيش مصدر بيرتب المدن رقميًا عليها.",
  );
  p();
  p("- **بتتعرض كوصف مش كرقم.** \"جالية عربية كبيرة\" — مش \"٤ من ٥\".");
  p("- الرقم داخلي للترتيب في محرك الخطة بس، ووزنه مسقوف في `lib/planner/judgment.ts`.");
  p("- لو لقيت مصدر فعلًا بيرتب واحد منهم رقميًا، حوّله `estimated` أو `verified`.");
  p();
  p("---");
  p();

  // متأخر عن ميعاد مراجعته
  p("## ⏰ عدّى ميعاد مراجعته");
  p();
  if (stale.length === 0) {
    p("مفيش حاجة متأخرة دلوقتي. ✅");
  } else {
    p("| الملف | الحقل | آخر مراجعة | المفروض كل |");
    p("|---|---|---|---|");
    for (const f of stale.slice(0, 40)) {
      p(`| \`${f.file}\` | \`${f.path}\` | ${f.lastVerified} | ${f.verifyIn} |`);
    }
    if (stale.length > 40) p(`| … | +${stale.length - 40} حقل | | |`);
  }
  p();
  p("---");
  p();

  // كل الناقص، مرتب حسب الملف
  p("## 📋 كل الحقول الناقصة");
  p();
  p(`${needs.length} حقل، في ${byFile.size} ملف.`);
  p();
  for (const [file, list] of [...byFile.entries()].sort()) {
    p(`<details><summary><code>${file}</code> — ${list.length}</summary>`);
    p();
    for (const f of list) {
      p(`- \`${f.path}\`${f.note ? ` — ${f.note}` : ""}`);
    }
    p();
    p("</details>");
    p();
  }

  p("---");
  p();
  p("## 🌐 الإنجليزي الناقص");
  p();
  p(
    `${missingEnglish.length} نص عربي جاهز والإنجليزي بتاعه لسه فاضي. ` +
      "اللغتين المفروض متساويتين — مفيش لغة \"أصلية\" ولغة \"ترجمة\".",
  );
  p();
  if (missingEnglish.length) {
    p("| الملف | العدد |");
    p("|---|---|");
    for (const [file, n] of missingEnglish
      .reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map<string, number>())
      .entries()) {
      p(`| \`${file}\` | ${n} |`);
    }
  }
  p();
  p("## ✍️ محتوى لسه ماتكتبش");
  p();
  if (missingText.ar.length === 0) {
    p("مفيش. ✅");
  } else {
    p(
      `${missingText.ar.length} نص فاضي في اللغتين — دي حاجات محتاجة تتكتب من الأول ` +
        "مش تترجم. أوضحهم `howItPays` في ملفات `jobs/`: إزاي كل تطبيق بيحسب أرباحه.",
    );
    p();
    p("| الملف | العدد |");
    p("|---|---|");
    for (const [file, n] of missingText.ar
      .reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map<string, number>())
      .entries()) {
      p(`| \`${file}\` | ${n} |`);
    }
  }
  p();
  p("---");
  p();
  p("## إزاي تأكّد حقل");
  p();
  p("1. افتح المصدر الرسمي وشوف الرقم بعينك");
  p("2. غيّر `value` و `status: \"verified\"` و `lastVerified` لتاريخ النهاردة");
  p("3. حط اللينك المباشر في `sources`");
  p("4. `npm run verify-content` تاني");
  p();
  p("> ولو الرقم تقديري مش مؤكد: `status: \"estimated\"` **لازم** معاه `basis` (التقدير جه منين)");
  p("> و `verifyIn` (يتراجع كل قد إيه). من غيرهم الـbuild بيفشل.");

  writeFileSync(join(process.cwd(), "TODO-VERIFY.md"), lines.join("\n") + "\n");

  console.log(`✅ المحتوى سليم — ${fields.length} حقل اتحقق منهم`);
  console.log(
    `   verified ${counts.verified} · estimated ${counts.estimated} · ` +
      `judgment ${counts.judgment} · محتاج تأكيد ${counts.NEEDS_VERIFICATION}`,
  );
  if (stale.length) console.log(`⏰ ${stale.length} حقل عدّى ميعاد مراجعته`);
  console.log("📝 TODO-VERIFY.md اتحدّث");
}

try {
  main();
} catch (err) {
  console.error("❌ المحتوى مش سليم — الـbuild وقف\n");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

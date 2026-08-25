/**
 * محرك الخطة. rule-based و deterministic و قابل للاختبار — مفيش AI.
 *
 * ثلاث قواعد حاكمة:
 *
 * ١. **لازم يطلع خطة لأي مبلغ.** ممنوع يقول "المبلغ مش كفاية" ويقف.
 *    دايمًا في مسار، حتى لو مسار صعب — بس بيتكلم بصراحة عن مخاطره.
 *
 * ٢. **رقم ناقص ≠ صفر.** أي حقل قيمته null بيتسجل في `unverifiedFields`
 *    وبيتشال من الحسبة، والواجهة بتقول للمستخدم إن الرقم ده ناقص.
 *    ممنوع نعتبره صفر — ده بيدي خطة متفائلة غلط.
 *
 * ٣. **الأحكام الذاتية مبتقلبش ترشيح.** الحقايق بترتب المدن، والأحكام
 *    بتفصل بين المتعادلين بس (rankWithJudgment).
 */

import type {
  Localized,
  MetroScore,
  PlanResult,
  PlannerInput,
  RequiredAmountInput,
  RequiredAmountResult,
  Source,
  Tier,
} from "@/lib/types";
import type { PlannerMetro } from "./metro";
import { tierFor, type TierPolicy } from "./tiers";
import { capJudgment, rankWithJudgment } from "./judgment";

/* ------------------------------------------------------------------ *
 * أدوات صغيرة
 * ------------------------------------------------------------------ */

interface Missing {
  add(metro: string, field: string): void;
  list(): string[];
}

function tracker(): Missing {
  const set = new Set<string>();
  return {
    add: (metro, field) => set.add(`${metro}.${field}`),
    list: () => [...set].sort(),
  };
}

/** بيقرا قيمة رقمية، وبيسجلها كناقصة لو مش موجودة. بيرجع null مش صفر. */
function val(
  m: PlannerMetro,
  key: keyof PlannerMetro,
  missing: Missing,
): number | null {
  const f = m[key] as { value: unknown } | undefined;
  const v = f && typeof f.value === "number" ? f.value : null;
  if (v === null) missing.add(m.slug, String(key));
  return v;
}

function sum(parts: (number | null)[]): number {
  return parts.reduce<number>((t, p) => t + (p ?? 0), 0);
}

/** عدد "وحدات الأكل" — الطفل بياكل أقل من البالغ. */
export function eatingUnits(adults: number, kidsAges: number[]): number {
  return adults + kidsAges.reduce((t, age) => t + (age >= 12 ? 0.8 : 0.5), 0);
}

/* ------------------------------------------------------------------ *
 * التكاليف
 * ------------------------------------------------------------------ */

export const TRAVEL_COST_PER_ADULT = 900;
export const TRAVEL_COST_PER_KID = 700;
/** تأسيس أساسي: مرتبة، أغطية، أواني، تليفون، شريحة، مصاريف أول أسبوع. */
export const SETUP_PER_HOUSEHOLD = 600;
export const SETUP_PER_EXTRA_PERSON = 150;

export interface CostBreakdown {
  key: string;
  label: Localized;
  amount: number;
  /** الرقم ده اتحسب من حقل ناقص؟ */
  incomplete: boolean;
}

/** الإيجار المناسب لحجم العيلة — غرفة للفرد، شقة للعيلة. */
function housingMonthly(
  m: PlannerMetro,
  people: number,
  goAlone: boolean,
  missing: Missing,
): { amount: number | null; kind: "room" | "apt1br" | "apt2br" } {
  if (goAlone || people === 1) {
    return { amount: val(m, "roomRent", missing), kind: "room" };
  }
  if (people <= 3) return { amount: val(m, "apt1br", missing), kind: "apt1br" };
  return { amount: val(m, "apt2br", missing), kind: "apt2br" };
}

export function landingCost(
  m: PlannerMetro,
  opts: {
    adults: number;
    kidsAges: number[];
    goAlone: boolean;
    includeTravel: boolean;
    hostNights: number;
  },
  missing: Missing,
): { total: number; breakdown: CostBreakdown[] } {
  const people = opts.goAlone ? 1 : opts.adults + opts.kidsAges.length;
  const kids = opts.goAlone ? 0 : opts.kidsAges.length;
  const adults = opts.goAlone ? 1 : opts.adults;

  const housing = housingMonthly(m, people, opts.goAlone, missing);
  const deposit = val(m, "securityDeposit", missing);
  const groceries = val(m, "groceriesPerAdult", missing);
  const utilities = val(m, "utilities", missing);

  // الاستضافة بتأجل الإيجار مش بتلغيه — بس بتوفر إيجار الأيام دي
  const hostedMonths = Math.min(opts.hostNights / 30, 1);
  const firstRent = housing.amount === null ? null : housing.amount * (1 - hostedMonths);

  const rows: CostBreakdown[] = [
    {
      key: "travel",
      label: { ar: "تذاكر السفر", en: "Flights" },
      amount: opts.includeTravel
        ? adults * TRAVEL_COST_PER_ADULT + kids * TRAVEL_COST_PER_KID
        : 0,
      incomplete: false,
    },
    {
      key: "firstRent",
      label: { ar: "إيجار أول شهر", en: "First month's rent" },
      amount: firstRent ?? 0,
      incomplete: firstRent === null,
    },
    {
      key: "deposit",
      label: { ar: "تأمين السكن", en: "Security deposit" },
      // التأمين بيتقاس كمضاعف للإيجار
      amount:
        deposit !== null && housing.amount !== null ? deposit * housing.amount : 0,
      incomplete: deposit === null || housing.amount === null,
    },
    {
      key: "setup",
      label: { ar: "تأسيس أساسي", en: "Basic setup" },
      amount:
        SETUP_PER_HOUSEHOLD + Math.max(0, people - 1) * SETUP_PER_EXTRA_PERSON,
      incomplete: false,
    },
    {
      key: "firstFood",
      label: { ar: "أكل أول شهر", en: "First month's food" },
      amount:
        groceries !== null ? groceries * eatingUnits(adults, opts.goAlone ? [] : opts.kidsAges) : 0,
      incomplete: groceries === null,
    },
    {
      key: "utilities",
      label: { ar: "فواتير أول شهر", en: "First month's utilities" },
      amount: utilities ?? 0,
      incomplete: utilities === null,
    },
  ];

  return { total: sum(rows.map((r) => r.amount)), breakdown: rows };
}

export function monthlyBurn(
  m: PlannerMetro,
  opts: { adults: number; kidsAges: number[]; goAlone: boolean; needsCar: boolean },
  missing: Missing,
): { total: number; breakdown: CostBreakdown[] } {
  const people = opts.goAlone ? 1 : opts.adults + opts.kidsAges.length;
  const adults = opts.goAlone ? 1 : opts.adults;
  const kidsAges = opts.goAlone ? [] : opts.kidsAges;

  const housing = housingMonthly(m, people, opts.goAlone, missing);
  const groceries = val(m, "groceriesPerAdult", missing);
  const utilities = val(m, "utilities", missing);
  const transit = val(m, "monthlyTransitPass", missing);
  const insurance = opts.needsCar ? val(m, "carInsurance", missing) : null;

  const rows: CostBreakdown[] = [
    {
      key: "rent",
      label: { ar: "الإيجار", en: "Rent" },
      amount: housing.amount ?? 0,
      incomplete: housing.amount === null,
    },
    {
      key: "food",
      label: { ar: "الأكل", en: "Food" },
      amount: groceries !== null ? groceries * eatingUnits(adults, kidsAges) : 0,
      incomplete: groceries === null,
    },
    {
      key: "utilities",
      label: { ar: "الفواتير", en: "Utilities" },
      amount: utilities ?? 0,
      incomplete: utilities === null,
    },
    {
      key: "transport",
      label: {
        ar: opts.needsCar ? "تأمين العربية والبنزين" : "المواصلات",
        en: opts.needsCar ? "Car insurance and fuel" : "Transit",
      },
      // البنزين تقدير ثابت بسيط لحد ما حاسبة العربية تدخل في الحسبة
      amount: opts.needsCar ? (insurance ?? 0) + 120 : (transit ?? 0) * adults,
      incomplete: opts.needsCar ? insurance === null : transit === null,
    },
    {
      key: "phone",
      label: { ar: "التليفون", en: "Phone" },
      amount: 30 * adults,
      incomplete: false,
    },
  ];

  return { total: sum(rows.map((r) => r.amount)), breakdown: rows };
}

/* ------------------------------------------------------------------ *
 * ترتيب المدن
 * ------------------------------------------------------------------ */

interface Scored extends MetroScore {
  factual: number;
  judgment: number;
}

/** بيحوّل سلم ١-٥ لنقاط، وبيرجع صفر لو الحقل ناقص (مش بيخمّن). */
function scale(v: number | null, weight: number, invert = false): number {
  if (v === null) return 0;
  const normalised = invert ? 5 - v : v;
  return (normalised / 5) * weight;
}

export function scoreMetros(
  metros: PlannerMetro[],
  input: PlannerInput,
  policy: TierPolicy,
  goAlone: boolean,
  missing: Missing,
): MetroScore[] {
  const w = policy.metroWeights;

  const scored: Scored[] = metros.map((m) => {
    const burn = monthlyBurn(
      m,
      {
        adults: input.adults,
        kidsAges: input.kidsAges,
        goAlone,
        needsCar: (m.carNeed.value ?? 3) >= 4,
      },
      missing,
    );
    const landing = landingCost(
      m,
      {
        adults: input.adults,
        kidsAges: input.kidsAges,
        goAlone,
        includeTravel: !input.moneyIncludesTravel,
        hostNights: input.hostCity === m.slug ? input.hostNights : 0,
      },
      missing,
    );

    const cash = input.money - landing.total - input.monthlyDebt;
    const net = burn.total - input.monthlyIncomeFromHome;
    const runway = net <= 0 ? Infinity : cash / net;

    // ---- الحقايق ----
    let factual = 0;
    const why: Localized[] = [];

    // رخص المعيشة: كل ما الburn أقل كل ما الscore أعلى
    if (burn.total > 0) {
      factual += (w["lowCost"] ?? 0) * (2000 / Math.max(burn.total, 400));
    }
    factual += scale(m.carNeed.value, w["worksWithoutCar"] ?? 0, true);
    factual += scale(m.worksWithoutEnglish.value, w["worksWithoutEnglish"] ?? 0);
    factual -= scale(m.winterSeverity.value, w["winterPenalty"] ?? 0);
    if (input.kidsAges.length > 0) {
      factual += scale(m.schoolQuality.value, w["schools"] ?? 0);
    }
    if (input.hostCity && input.hostCity === m.slug) {
      factual += w["hostPresence"] ?? 0;
      why.push({
        ar: "فيه حد تعرفه هنا — ده بيوفر أسابيع سكن وبداية أسهل",
        en: "You know someone here — that saves weeks of rent and an easier start",
      });
    }

    // ---- الأحكام الذاتية (بتفصل بين المتعادلين بس) ----
    const judgment =
      scale(m.gigDemand.value, w["gigDemand"] ?? 0) +
      scale(m.arabCommunity.value, w["career"] ?? 0);

    if ((m.carNeed.value ?? 3) <= 2) {
      why.push({
        ar: "تقدر تعيش هنا من غير عربية — ده أكبر توفير ممكن في أول سنة",
        en: "You can live here without a car — the biggest first-year saving available",
      });
    }
    if (m.gigDemand.label) why.push(m.gigDemand.label);
    if (m.arabCommunity.label) why.push(m.arabCommunity.label);

    const capped = capJudgment({ factual, judgment });

    return {
      slug: m.slug,
      name: m.name,
      score: capped.score,
      runwayMonths: Number.isFinite(runway) ? Math.max(0, runway) : 99,
      why,
      judgmentContribution: capped.judgmentContribution,
      factual,
      judgment,
    };
  });

  return rankWithJudgment(scored).map(({ factual: _f, judgment: _j, ...rest }) => rest);
}

/* ------------------------------------------------------------------ *
 * الخطة
 * ------------------------------------------------------------------ */

function shouldGoAlone(policy: TierPolicy, input: PlannerInput): boolean {
  if (input.travellingAlone) return true;
  return policy.goAloneFirst === "almost-always" || policy.goAloneFirst === "usually";
}

function reasonsFor(
  tier: Tier,
  runway: number,
  goAlone: boolean,
  burn: number,
): Localized[] {
  const months = runway === 99 ? "أكتر من سنة" : runway.toFixed(1);
  const out: Localized[] = [
    {
      ar: `بمصاريف الشهر المتوقعة، فلوسك تكفيك ${months} شهر.`,
      en: `At the expected monthly spend, your money lasts ${months} months.`,
    },
    {
      ar: `مصاريفك الشهرية المتوقعة حوالي $${Math.round(burn)}.`,
      en: `Your expected monthly spend is about $${Math.round(burn)}.`,
    },
  ];

  if (goAlone) {
    out.push({
      ar: "تروح لوحدك الأول: مصاريف فرد واحد أقل بكتير، وتقدر تجهز المكان قبل ما العيلة تيجي.",
      en: "Go alone first: one person costs far less, and you can set things up before the family arrives.",
    });
  }
  if (tier === "A") {
    out.push({
      ar: "الوضع ضيق، فالأولوية إن الدخل يبدأ بسرعة والسكن يبقى غرفة مش شقة.",
      en: "Money is tight, so the priority is income starting fast and a room rather than an apartment.",
    });
  }
  return out;
}

function weeklyActions(policy: TierPolicy): { week: number; task: Localized }[] {
  const base: { week: number; task: Localized }[] = [
    { week: 1, task: { ar: "SSN، شريحة تليفون، وحساب بنكي", en: "SSN, phone SIM, bank account" } },
    { week: 1, task: { ar: "عنوان ثابت تستقبل عليه بريدك", en: "A fixed address to receive mail" } },
    { week: 2, task: { ar: "تسجيل في تطبيقات الشغل اللي متاحة من غير عربية", en: "Sign up for gig apps that work without a car" } },
    { week: 3, task: { ar: "رخصة القيادة — ابدأ الإجراءات بدري", en: "Driver's license — start the process early" } },
    { week: 4, task: { ar: "افتح credit card مضمون (secured) عشان تبدأ تاريخك الائتماني", en: "Open a secured credit card to start your credit history" } },
    { week: 6, task: { ar: "راجع مصاريفك الفعلية وقارنها بالخطة", en: "Review actual spending against the plan" } },
    { week: 8, task: { ar: "لو الدخل مستقر، ابدأ تدوّر على شغل أثبت", en: "If income is steady, start looking for steadier work" } },
  ];

  if (policy.carTiming === "month-1") {
    base.splice(3, 0, {
      week: 3,
      task: { ar: "شرا عربية مستعملة بعد فحص PPI", en: "Buy a used car after a pre-purchase inspection" },
    });
  }
  return base.sort((a, b) => a.week - b.week);
}

function risksFor(
  tier: Tier,
  metros: MetroScore[],
  missingCount: number,
): { risk: Localized; mitigation: Localized }[] {
  const out: { risk: Localized; mitigation: Localized }[] = [];

  if (tier === "A" || tier === "B") {
    out.push({
      risk: {
        ar: "لو الدخل اتأخر شهر عن المتوقع، الفلوس ممكن تخلص قبل ما تستقر.",
        en: "If income starts a month later than expected, the money can run out before you settle.",
      },
      mitigation: {
        ar: "ابدأ التسجيل في تطبيقات الشغل من قبل ما تسافر، وخلي أول أسبوعين مخصصين للورق اللي بيفتح الشغل (SSN والرخصة).",
        en: "Register with gig apps before you travel, and spend the first two weeks on the paperwork that unlocks work (SSN and license).",
      },
    });
  }

  const carCity = metros[0];
  if (carCity && carCity.runwayMonths < 3) {
    out.push({
      risk: {
        ar: "المدينة المرشحة مصاريفها بتاكل فلوسك بسرعة.",
        en: "The recommended city burns through your money quickly.",
      },
      mitigation: {
        ar: "قارن مع مدينة أرخص في القايمة قبل ما تحجز أي حاجة.",
        en: "Compare against a cheaper city on the list before you book anything.",
      },
    });
  }

  if (missingCount > 0) {
    out.push({
      risk: {
        ar: `الخطة دي اعتمدت على ${missingCount} حقل لسه محتاج تأكيد — يعني الأرقام ممكن تتغير.`,
        en: `This plan relies on ${missingCount} fields that still need verification — the numbers may change.`,
      },
      mitigation: {
        ar: "شوف صفحة المصادر واعرف أنهي رقم بالظبط لسه مش مؤكد قبل ما تبني عليه قرار.",
        en: "Check the sources page to see exactly which numbers are unconfirmed before deciding on them.",
      },
    });
  }

  return out;
}

export function computePlan(
  input: PlannerInput,
  metros: PlannerMetro[],
): PlanResult {
  const missing = tracker();

  // أول تقدير للـtier بيتعمل على أرخص مدينة متاحة، بعدين بيتظبط
  const provisional = tierFor(6);
  const goAloneFirst = shouldGoAlone(provisional, input);

  const ranked = scoreMetros(metros, input, provisional, goAloneFirst, missing);
  const best = ranked[0];

  const chosen = best ? metros.find((m) => m.slug === best.slug)! : metros[0]!;
  const needsCar = (chosen.carNeed.value ?? 3) >= 4;

  const landing = landingCost(
    chosen,
    {
      adults: input.adults,
      kidsAges: input.kidsAges,
      goAlone: goAloneFirst,
      includeTravel: !input.moneyIncludesTravel,
      hostNights: input.hostCity === chosen.slug ? input.hostNights : 0,
    },
    missing,
  );
  const burn = monthlyBurn(
    chosen,
    {
      adults: input.adults,
      kidsAges: input.kidsAges,
      goAlone: goAloneFirst,
      needsCar,
    },
    missing,
  );

  const availableCash = input.money - landing.total - input.monthlyDebt;
  const net = burn.total - input.monthlyIncomeFromHome;
  const runwayMonths = net <= 0 ? 99 : Math.max(0, availableCash / net);

  const policy = tierFor(runwayMonths);
  const goAlone = shouldGoAlone(policy, input);

  // إعادة ترتيب بأوزان الشريحة الصح
  const finalRanked = scoreMetros(metros, input, policy, goAlone, missing);

  const projection = [];
  for (let month = 1; month <= 12; month++) {
    projection.push({
      month,
      slow: Math.round(availableCash - net * month),
      expected: Math.round(availableCash - net * month + 900 * Math.max(0, month - 1)),
      fast: Math.round(availableCash - net * month + 1800 * Math.max(0, month - 1)),
    });
  }

  const sources: Source[] = [];
  const unverified = missing.list().filter((f) => f.startsWith(chosen.slug));

  return {
    tier: policy.tier,
    runwayMonths,
    landingCost: landing.total,
    monthlyBurn: burn.total,
    goAlone,
    reasons: reasonsFor(policy.tier, runwayMonths, goAlone, burn.total),
    recommendedMetros: finalRanked.slice(0, 3),
    avoidMetros: finalRanked.slice(-3).reverse(),
    monthlyProjection: projection,
    weeklyActions: weeklyActions(policy),
    risks: risksFor(policy.tier, finalRanked, unverified.length),
    sources,
    unverifiedFields: missing.list(),
  };
}

/* ------------------------------------------------------------------ *
 * الاتجاه التاني: "محتاج كام؟"
 * ------------------------------------------------------------------ */

export function computeRequired(
  input: RequiredAmountInput,
  metros: PlannerMetro[],
): RequiredAmountResult | null {
  const m = metros.find((x) => x.slug === input.metro);
  if (!m) return null;

  const missing = tracker();
  const goAlone = input.adults === 1 && input.kidsAges.length === 0;
  const needsCar = (m.carNeed.value ?? 3) >= 4;

  const landing = landingCost(
    m,
    {
      adults: input.adults,
      kidsAges: input.kidsAges,
      goAlone,
      includeTravel: input.includeTravel,
      hostNights: 0,
    },
    missing,
  );
  const burn = monthlyBurn(
    m,
    { adults: input.adults, kidsAges: input.kidsAges, goAlone, needsCar },
    missing,
  );

  const net = Math.max(0, burn.total - input.monthlyIncomeFromHome);
  const months = Math.max(0, input.monthsWithoutWork);

  return {
    metro: m.slug,
    totalNeeded: Math.round(landing.total + net * months),
    landingCost: Math.round(landing.total),
    monthlyBurn: Math.round(burn.total),
    monthsWithoutWork: months,
    breakdown: [
      ...landing.breakdown.map((b) => ({
        key: b.key,
        label: b.label,
        amount: Math.round(b.amount),
      })),
      {
        key: "months",
        label: {
          ar: `معيشة ${months} شهر من غير شغل`,
          en: `${months} months of living without work`,
        },
        amount: Math.round(net * months),
      },
    ],
    unverifiedFields: missing.list(),
    sources: [],
  };
}

import { z } from "zod";

/**
 * كل قيمة في المحتوى بتتلف في الشكل ده. مفيش استثناء.
 *
 * ٤ حالات و٣ بادچات بس:
 *
 *   verified            → من غير بادج. المصدر في الفوتنوت.
 *   estimated           → بادج "تقديري" هادي، و`basis` في الtooltip.
 *   judgment            → من غير بادج. ⚠️ بيتعرض كوصف مش كرقم — القيمة الرقمية
 *                          داخلية للترتيب بس ومينفعش تظهر للمستخدم.
 *   NEEDS_VERIFICATION  → بادج "محتاج تأكيد"، ومفيش رقم أصلًا.
 */

export const STATUSES = [
  "verified",
  "estimated",
  "judgment",
  "NEEDS_VERIFICATION",
] as const;

export type Status = (typeof STATUSES)[number];

export const Source = z.object({
  label: z.string().min(2),
  url: z.string().url(),
});

export const Localized = z.object({
  ar: z.string().min(1),
  en: z.string().min(1),
});

/** نص عربي جاهز وإنجليزي لسه فاضي — مسموح مؤقتًا وبيتعدّ في تقرير verify-content. */
export const LocalizedDraft = z.object({
  ar: z.string().min(1),
  en: z.string(),
});

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ لازم يكون YYYY-MM-DD");

/** كل قد إيه الحقل ده محتاج يتراجع. الscript بيحسب تاريخ المراجعة من `lastVerified`. */
export const VERIFY_PERIODS = {
  "each-cycle": 365, // بيتغير كل دورة قرعة
  "3-months": 90,
  "6-months": 180,
  "1-year": 365,
  "2-years": 730,
} as const;

export const VerifyIn = z.enum(
  Object.keys(VERIFY_PERIODS) as [keyof typeof VERIFY_PERIODS],
);

/** شكل أي حقل قيمة. بيتعاد استخدامه في بنود الشيك ليست كمان. */
export const fieldShape = {
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  unit: z.string().optional(),
  range: z.tuple([z.number(), z.number()]).optional(),
  status: z.enum(STATUSES),
  sources: z.array(Source),
  lastVerified: ISO_DATE,

  /** إيه اللي المراجع لازم يدوّر عليه */
  note: z.string().optional(),

  /** إجباري مع `estimated`: التقدير ده جه منين بالظبط. بيظهر للمستخدم في tooltip. */
  basis: LocalizedDraft.optional(),

  /** إجباري مع `estimated`: يتراجع كل قد إيه. */
  verifyIn: VerifyIn.optional(),

  /**
   * إجباري مع `judgment`: الوصف اللي بيتعرض **مكان** الرقم.
   * "جالية عربية كبيرة" — مش "٤ من ٥".
   */
  label: LocalizedDraft.optional(),
} as const;

type FieldLike = {
  value: unknown;
  status: Status;
  sources: unknown[];
  basis?: unknown;
  verifyIn?: unknown;
  label?: unknown;
};

/** قواعد كل حالة. متشالتش في دالة عشان بنطبقها على الحقول وعلى بنود الشيك ليست. */
export function applyStatusRules(f: FieldLike, ctx: z.RefinementCtx) {
  const fail = (message: string, path?: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: path ? [path] : [] });

  switch (f.status) {
      case "verified":
        if (f.value === null) fail("حقل verified مينفعش قيمته null", "value");
        if (f.sources.length === 0) fail("حقل verified لازم يكون عليه مصدر واحد على الأقل", "sources");
        break;

      case "estimated":
        // مسموح من غير مصدر — بس لازم يقول التقدير جه منين، وإمتى يتراجع.
        if (!f.basis) fail("حقل estimated لازم يكون عليه basis — التقدير جه منين", "basis");
        if (!f.verifyIn) fail("حقل estimated لازم يكون عليه verifyIn", "verifyIn");
        if (f.value === null) fail("حقل estimated من غير قيمة يبقى NEEDS_VERIFICATION", "value");
        break;

      case "judgment":
        // حكم شخصي. مفيش مصدر بيرتب الحاجات دي رقميًا، وده مش عيب —
        // العيب إنها تتعرض كأنها قياس.
        if (!f.label) {
          fail("حقل judgment لازم يكون عليه label — الوصف اللي هيظهر مكان الرقم", "label");
        }
        if (f.value === null) fail("حقل judgment من غير قيمة يبقى NEEDS_VERIFICATION", "value");
        if (f.sources.length > 0) {
          fail(
            "لو فيه مصدر فعلًا بيرتب الحقل ده، يبقى مش judgment — حوّله estimated أو verified",
            "sources",
          );
        }
        break;

    case "NEEDS_VERIFICATION":
      if (f.value !== null) fail("حقل NEEDS_VERIFICATION لازم قيمته null", "value");
      break;
  }
}

export const Field = z.object(fieldShape).superRefine(applyStatusRules);

export type FieldT = z.infer<typeof Field>;

/** ⚠️ الحاجة للعربية معلومة على مستوى المدينة مش الولاية.
 *  نيويورك ستيت: مدينة نيويورك = 1، بافالو = 4.
 *  فرجينيا: أرلينجتون = 2، ريتشموند = 5.
 *  متعمّمش أبدًا من الولاية على المدينة — ده بيدي نصيحة غلط لحد بيخطط بفلوسه. */
export const CarBlock = z.object({
  carNeed: Field, // 1 = مش محتاج خالص … 5 = مستحيل من غيرها
  carNeedLabel: Localized,
  transitSystem: Field,
  transitScore: Field,
  carFreeNeighborhoods: Field,
  monthlyTransitPass: Field,
});

export const State = z.object({
  code: z.string().length(2),
  name: Localized,
  hasStateIncomeTax: Field,
  incomeTaxRate: Field,
  noFaultInsurance: Field, // بيأثر على تكلفة تأمين العربية
  licenseProcess: Field,
  winterSeverity: Field,
  arabCommunity: Field,
  salesTax: Field,
  lastVerified: ISO_DATE,
});

export const Metro = z.object({
  slug: z.string(),
  name: Localized,
  state: z.string().length(2),
  car: CarBlock,
  costs: z.object({
    roomRent: Field, // غرفة في شقة مشتركة
    apt1br: Field,
    apt2br: Field,
    securityDeposit: Field, // بيتحسب عادة كمضاعف للإيجار
    utilities: Field,
    groceriesPerAdult: Field,
    carInsurance: Field,
  }),
  work: z.object({
    gigDemand: Field,
    worksWithoutEnglish: Field,
    warehouseJobs: Field,
  }),
  life: z.object({
    arabCommunity: Field,
    halalAccess: Field,
    schoolQuality: Field,
    winterSeverity: Field, // ٥ = شتا قاسي
  }),
  lastVerified: ISO_DATE,
});

export const Fee = z.object({
  id: z.string(),
  name: Localized,
  who: LocalizedDraft, // مين بيدفعه
  when: LocalizedDraft, // إمتى بالظبط
  perPerson: z.boolean(),
  amount: Field,
});

export const Step = z.object({
  id: z.string(),
  order: z.number(),
  name: LocalizedDraft,
  what: LocalizedDraft,
  durationDays: Field,
  blocks: z.array(z.string()), // ids الخطوات اللي متوقفة عليه
});

export const Job = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.enum([
    "food-delivery",
    "rideshare",
    "package-delivery",
    "grocery",
    "warehouse",
  ]),
  needsCar: Field,
  minCarYear: Field,
  needsEnglish: Field,
  activationDays: Field,
  howItPays: LocalizedDraft,
  pros: z.array(LocalizedDraft),
  cons: z.array(LocalizedDraft),
  signupUrl: z.string().url(),
});

export const GlossaryTerm = z.object({
  term: z.string(),
  pronunciation: z.string(),
  ar: z.string(),
  en: z.string(),
  whyItMatters: LocalizedDraft,
  related: z.array(z.string()),
});

/** بند الشيك ليست = نص + نفس قواعد الحالة بتاعة أي حقل تاني. */
export const ChecklistItem = z
  .object({
    id: z.string(),
    title: LocalizedDraft,
    detail: LocalizedDraft,
    verifyNote: z.string().optional(),
    status: z.enum(STATUSES),
    sources: z.array(Source),
    lastVerified: ISO_DATE,
    basis: LocalizedDraft.optional(),
    verifyIn: VerifyIn.optional(),
  })
  // البند مالوش قيمة رقمية — النص نفسه هو القيمة، فقواعده أبسط.
  .superRefine((item, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });

    if (item.status === "verified" && item.sources.length === 0) {
      fail("بند verified لازم يكون عليه مصدر", "sources");
    }
    if (item.status === "estimated") {
      if (!item.basis) fail("بند estimated لازم يكون عليه basis", "basis");
      if (!item.verifyIn) fail("بند estimated لازم يكون عليه verifyIn", "verifyIn");
    }
    if (item.status === "judgment") {
      fail("judgment مالهاش معنى في بند شيك ليست — ده إجراء مش ترتيب", "status");
    }
    if (item.status === "NEEDS_VERIFICATION" && !item.verifyNote) {
      fail("بند NEEDS_VERIFICATION لازم يقول المراجع يدوّر على إيه", "verifyNote");
    }
  });

export const Checklist = z.object({
  _note: z.string().optional(),
  id: z.string(),
  name: Localized,
  items: z.array(ChecklistItem),
  lastVerified: ISO_DATE,
});

/**
 * ⚠️ أخطر ملف في المشروع من ناحية التقادم — قايمة الدول بتتغير كل دورة.
 * الصفحة نفسها لازم تعرض `lastVerified` للمستخدم، ولو عدّى عليه أكتر من
 * فترة `verifyIn` تعرض تنبيه أوتوماتيك فوق المحتوى.
 */
export const EligibilityCriterion = z
  .object({
    id: z.string(),
    name: Localized,
    explain: LocalizedDraft,
  })
  // أي مفتاح زيادة في المعيار لازم يكون حقل كامل بقواعده — مفيش نص سايب.
  .catchall(Field);

export const Eligibility = z.object({
  _note: z.string().optional(),
  criteria: z.array(EligibilityCriterion).min(1),
  disclaimer: LocalizedDraft,
  lastVerified: ISO_DATE,
  /** الملف ده بيتغير كل دورة — القيمة دي بتتقرا في الواجهة عشان تحسب التنبيه. */
  verifyIn: VerifyIn.default("each-cycle"),
});

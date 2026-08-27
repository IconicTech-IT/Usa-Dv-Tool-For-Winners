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

/** محتوى لسه ماتكتبش خالص — الاتنين ممكن يكونوا فاضيين. بيترصد في verify-content. */
export const LocalizedPending = z.object({
  ar: z.string(),
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

  /**
   * ⚠️ لبنود السكن بس: الرقم ده شامل الفواتير جواه.
   *
   * مصادر زي HUD Fair Market Rent بتحسب الإيجار + المياه والكهربا والتدفئة
   * كرقم واحد. لو البند متعلّم كده والمحرك ضاف `utilities` فوقه، الفواتير
   * بتتحسب مرتين — والخطة بتقول للمستخدم إن فلوسه تكفيه أقل من الحقيقة.
   *
   * العلامة دي **مش تعليق** — المحرك بيقراها ويتخطى بند الفواتير،
   * والschema بيفشل الbuild لو حد ملا `utilities` لنفس المدينة.
   */
  includesUtilities: z.boolean().optional(),
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


/** شريحة ضريبية واحدة. `upTo: null` يعني الشريحة الأخيرة المفتوحة. */
export const Bracket = z.object({
  upTo: z.number().nullable(),
  rate: z.number().min(0).max(1),
});

/** حقل قيمته مصفوفة شرايح — نفس قواعد الحالات بالظبط. */
export const BracketField = z
  .object({
    ...fieldShape,
    value: z.array(Bracket).nullable(),
  })
  .superRefine(applyStatusRules);

/**
 * ⚠️ كل رقم ضريبي في المشروع بيتقرا من الملف ده. مفيش ولا رقم في الكود.
 * وسنة الضرايب **داتا جوه الملف** مش في اسم متغير ولا كومنت — لأن
 * رقم قديم بعنوان جديد بيتقرا كأنه صح والمستخدم بيحسب عليه فلوسه.
 */
export const TaxBrackets = z.object({
  _note: z.string().optional(),
  taxYear: Field,
  federalBrackets: z.object({
    single: BracketField,
    married: BracketField,
    headOfHousehold: BracketField,
  }),
  standardDeduction: z.object({
    single: Field,
    married: Field,
    headOfHousehold: Field,
  }),
  socialSecurityRate: Field,
  socialSecurityWageCap: Field,
  medicareRate: Field,
  childTaxCredit: Field,
  irsMileageRate: Field,
  selfEmploymentRate: Field,
  federalPovertyLine: z.object({ base: Field, perPerson: Field }),
  lastVerified: ISO_DATE,
});

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
  /** الولايات التصاعدية (كاليفورنيا، نيويورك…) بتتملي هنا بدل النسبة الثابتة. */
  incomeTaxBrackets: BracketField.optional(),
  noFaultInsurance: Field, // بيأثر على تكلفة تأمين العربية
  licenseProcess: Field,
  winterSeverity: Field,
  arabCommunity: Field,
  salesTax: Field,
  lastVerified: ISO_DATE,
});

/** بنود السكن اللي ممكن يكون سعرها شامل الفواتير. */
export const HOUSING_KEYS = ["roomRent", "apt1br", "apt2br"] as const;

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
  /** نيويورك وفيلادلفيا وديترويت وغيرهم بيفرضوا ضريبة دخل محلية فوق ضريبة الولاية. */
  localIncomeTax: Field.optional(),
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
})
  /**
   * ⚠️ الفواتير مينفعش تتحسب مرتين.
   *
   * لو بند سكن متعلّم `includesUtilities` (يعني رقمه جاي من مصدر زي HUD
   * شامل المياه والكهربا)، يبقى `costs.utilities` لازم يفضل `null`.
   * الحتة دي مكتوبة كقاعدة بتفشل الbuild مش كملاحظة في JSON — لأن
   * الملاحظة مش بتوقف حد بعد ٦ شهور بيملا حقل ناقص بحسن نية.
   */
  .superRefine((m, ctx) => {
    if (m.costs.utilities.value === null) return;

    for (const key of HOUSING_KEYS) {
      if (!m.costs[key].includesUtilities) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["costs", "utilities", "value"],
        message:
          `costs.${key} متعلّم includesUtilities — يعني سعره شامل الفواتير. ` +
          `لو حطيت رقم في costs.utilities كمان، الفواتير هتتحسب مرتين. ` +
          `يا تسيب utilities بـnull، يا تشيل includesUtilities من costs.${key} ` +
          `بعد ما تستبدل رقمه بإيجار فعلي من غير فواتير.`,
      });
    }
  });

/**
 * ⚠️ البنود المش مربوطة بمدينة — طيران، تأسيس، تليفون، بنزين.
 *
 * كانت أرقام ثابتة جوه `lib/planner/engine.ts` وبتظهر للمستخدم كإنها
 * حقيقة مؤكدة. مكانها هنا عشان تاخد حالة وbasis زي أي رقم تاني في الموقع.
 */
export const ArrivalCosts = z.object({
  _note: z.string().optional(),
  travelPerAdult: Field,
  travelPerKid: Field,
  travelPerInfant: Field,
  setupPerHousehold: Field,
  setupPerExtraPerson: Field,
  phonePerAdult: Field,
  fuelPerCarMonth: Field,
  usedCarPrice: Field,
  lastVerified: ISO_DATE,
});

/**
 * افتراضات الدخل اللي الرسم البياني بيرسم بيها.
 * ⚠️ دي **افتراضات معلنة مش قياسات** — والواجهة لازم تكتب الرقم المفترض
 * بالحرف جنب الخط، مش تقول "دخل متوقع" وخلاص.
 */
export const IncomeScenarios = z.object({
  _note: z.string().optional(),
  expectedMonthly: Field,
  fastMonthly: Field,
  startsInMonth: Field,
  lastVerified: ISO_DATE,
});

/**
 * مواقع بيدوّر فيها المستخدم بنفسه — سكن وشغل وعربيات وأثاث.
 *
 * ⚠️ **دي مش مصادر بيانات.** الفرق مهم: `sources` في أي `Field` معناها
 * "الرقم ده جه من هنا"، أما دي مواقع بنقول للمستخدم روح دوّر فيها.
 * فممنوع الملف ده يدخل `contentFiles()`، وإلا الدومينات دي هتظهر في
 * صفحة `/sources` كإنها مصادر رسمية للموقع.
 *
 * ⚠️ وممنوع أي لينك أفلييت — القاعدة الخامسة: مجاني للأبد ومن غير عمولة.
 */
export const ResourceSite = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  what: Localized,
  /** تحذير بيتعرض جنب اللينك — للمواقع اللي فيها نصب أو شرط أهلية */
  watch: Localized.optional(),
  /** جهة حكومية — بتتعلّم في الواجهة عشان تتفرق عن الشركات */
  official: z.boolean().optional(),
});

export const ResourceCategory = z.object({
  id: z.string().min(1),
  name: Localized,
  lead: Localized,
  /**
   * ⚠️ اللي إحنا **مش** عارفينه في القسم ده.
   *
   * صفحة زي دي سهل تتكتب بنبرة واثقة عن حاجات محدش أكّدها. لو فيه حاجة
   * مهمة ناقصة عندنا (زي مدة تفعيل تطبيقات التوصيل — كلها لسه
   * NEEDS_VERIFICATION في `content/jobs/`)، بتتقال هنا صراحة بدل ما
   * الصفحة تسكت وتسيب المستخدم يفترض إننا عارفين.
   */
  unknown: Localized.optional(),
  sites: z.array(ResourceSite).min(1),
});

export const ResourcesFile = z.object({
  _note: z.string().optional(),
  /**
   * ⚠️ آخر مرة حد فتح اللينكات دي بإيده وتأكد إنها شغالة.
   * `null` معناها **محدش فتحها لسه** — وverify-content بيقولها في التقرير.
   * لينك ميت في صفحة اسمها "مواقع تدوّر فيها" بيضيّع وقت حد بيدوّر على بيت.
   */
  linksLastChecked: ISO_DATE.nullable(),
  categories: z.array(ResourceCategory).min(1),
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
  /** لسه ماتكتبش لأي تطبيق — إزاي بيحسب الأرباح بيتغير وبيحتاج تأكيد من صفحة التطبيق */
  howItPays: LocalizedPending,
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

/* ------------------------------------------------------------------ *
 * أشكال الملفات نفسها (الwrapper اللي فيه _note والمصفوفة)
 * ------------------------------------------------------------------ */

export const FeesFile = z.object({
  _note: z.string().optional(),
  fees: z.array(Fee),
});

export const StepsFile = z.object({
  _note: z.string().optional(),
  steps: z.array(Step),
});

export const Document = z.object({
  id: z.string(),
  name: LocalizedDraft,
  /** "everyone" أو حالة معينة — الشيك ليست بتترشح بيها */
  appliesTo: z.string(),
  why: LocalizedDraft,
  watchOut: LocalizedDraft,
  needsTranslation: z.boolean(),
  validity: Field,
});

export const DocumentsFile = z.object({
  _note: z.string().optional(),
  documents: z.array(Document),
});

export const GlossaryFile = z.object({
  _note: z.string().optional(),
  terms: z.array(GlossaryTerm),
});

export const Scam = z.object({
  id: z.string(),
  title: LocalizedDraft,
  how: LocalizedDraft,
  truth: LocalizedDraft,
  redFlags: z.array(LocalizedDraft),
});

export const ScamsFile = z.object({
  _note: z.string().optional(),
  scams: z.array(Scam),
});

export const InterviewQuestion = z.object({
  q: LocalizedDraft,
  /** بيسأل عشان إيه — عشان المستخدم يفهم القصد مش يحفظ إجابة */
  why: LocalizedDraft,
  prepare: LocalizedDraft,
});

export const InterviewFile = z.object({
  _note: z.string().optional(),
  /** ⚠️ المبدأ: علّم الناس تجاوب بصدق. ممنوع أي محتوى بيعلّم حد يجمّل إجابة. */
  principle: Localized,
  categories: z.array(
    z.object({
      id: z.string(),
      name: LocalizedDraft,
      questions: z.array(InterviewQuestion),
    }),
  ),
});

export const JobPresetsFile = z.object({
  _note: z.string().optional(),
  presets: z.array(
    z.object({
      id: z.string(),
      name: LocalizedDraft,
      medianSalary: Field,
      needsLicense: Field,
    }),
  ),
});

export const JobFile = Job.extend({
  _note: z.string().optional(),
  summary: LocalizedDraft,
  requiresSSN: Field,
  beginnerTips: z.array(LocalizedDraft),
  lastVerified: ISO_DATE,
});

export const CarNeedScale = z.object({
  _note: z.string().optional(),
  scale: z.array(
    z.object({
      value: z.number(),
      ar: z.string(),
      en: z.string(),
      meaning: LocalizedDraft.optional(),
    }).passthrough(),
  ),
  plannerRule: z.string(),
});

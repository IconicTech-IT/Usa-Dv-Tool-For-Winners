import { describe, expect, it } from "vitest";
import {
  computePlan,
  computeRequired,
  eatingUnits,
  landingCost,
  monthlyBurn,
} from "@/lib/planner/engine";
import type { PlannerMetro } from "@/lib/planner/metro";
import type { Field, PlannerInput } from "@/lib/types";

const verified = (value: number): Field<number> => ({
  value,
  status: "verified",
  sources: [{ label: "test", url: "https://example.com/" }],
  lastVerified: "2026-08-25",
});

const nullField: Field<number> = {
  value: null,
  status: "NEEDS_VERIFICATION",
  sources: [],
  lastVerified: "2026-08-25",
};

function metro(slug: string, over: Partial<PlannerMetro> = {}): PlannerMetro {
  return {
    slug,
    name: { ar: slug, en: slug },
    state: "TX",
    carNeed: verified(2),
    carNeedLabel: { ar: "شبه مش محتاج", en: "Mostly not needed" },
    transitScore: verified(4),
    monthlyTransitPass: verified(80),
    roomRent: verified(700),
    apt1br: verified(1200),
    apt2br: verified(1500),
    securityDeposit: verified(1),
    utilities: verified(150),
    groceriesPerAdult: verified(300),
    carInsurance: verified(200),
    gigDemand: verified(4),
    worksWithoutEnglish: verified(4),
    arabCommunity: verified(3),
    schoolQuality: verified(3),
    winterSeverity: verified(2),
    ...over,
  };
}

const input: PlannerInput = {
  money: 5000,
  moneyIncludesTravel: false,
  monthlyIncomeFromHome: 0,
  monthlyDebt: 0,
  travellingAlone: true,
  adults: 1,
  kidsAges: [],
  spouseWillWork: false,
  hostCity: null,
  hostNights: 0,
  englishLevel: 2,
  drivingYears: 3,
  profession: "",
  openToPhysicalWork: true,
  priorities: ["fastIncome", "lowCost", "community", "schools", "career"],
};

describe("الحسابات الأساسية", () => {
  it("الطفل بياكل أقل من البالغ", () => {
    expect(eatingUnits(2, [])).toBe(2);
    expect(eatingUnits(2, [5])).toBe(2.5);
    expect(eatingUnits(2, [14])).toBeCloseTo(2.8);
  });

  it("الاستضافة بتقلل إيجار أول شهر", () => {
    const m = metro("x");
    const t = { add: () => {}, list: () => [] };
    const withHost = landingCost(
      m,
      { adults: 1, kidsAges: [], goAlone: true, includeTravel: false, hostNights: 30 },
      t,
    );
    const without = landingCost(
      m,
      { adults: 1, kidsAges: [], goAlone: true, includeTravel: false, hostNights: 0 },
      t,
    );
    expect(withHost.total).toBeLessThan(without.total);
  });

  it("مدينة محتاجة عربية مصاريفها الشهرية أعلى", () => {
    const t = { add: () => {}, list: () => [] };
    const m = metro("x");
    const withCar = monthlyBurn(
      m,
      { adults: 1, kidsAges: [], goAlone: true, needsCar: true },
      t,
    );
    const withoutCar = monthlyBurn(
      m,
      { adults: 1, kidsAges: [], goAlone: true, needsCar: false },
      t,
    );
    expect(withCar.total).toBeGreaterThan(withoutCar.total);
  });
});

describe("⚠️ الحقول الناقصة", () => {
  it("رقم ناقص مبيتحسبش صفر — بيتسجل وبيتشال", () => {
    const broken = metro("broken", { roomRent: nullField });
    const plan = computePlan(input, [broken]);
    expect(plan.unverifiedFields).toContain("broken.roomRent");
  });

  it("مدينة كل أرقامها ناقصة لسه بتطلع خطة، مش بتكسر", () => {
    const empty = metro("empty", {
      roomRent: nullField,
      apt1br: nullField,
      apt2br: nullField,
      utilities: nullField,
      groceriesPerAdult: nullField,
      monthlyTransitPass: nullField,
      carInsurance: nullField,
      securityDeposit: nullField,
    });
    const plan = computePlan(input, [empty]);
    expect(plan.tier).toBeDefined();
    expect(plan.weeklyActions.length).toBeGreaterThan(0);
    expect(plan.unverifiedFields.length).toBeGreaterThan(4);
    // وبيقول للمستخدم إن الخطة مبنية على أرقام ناقصة
    expect(plan.risks.some((r) => r.risk.ar.includes("محتاج تأكيد"))).toBe(true);
  });
});

describe("⚠️ لازم تطلع خطة لأي مبلغ", () => {
  const amounts = [500, 1500, 2500, 5000, 15000, 50000];

  for (const money of amounts) {
    it(`بتطلع خطة بـ$${money}`, () => {
      const plan = computePlan({ ...input, money }, [metro("a"), metro("b")]);
      expect(plan.recommendedMetros.length).toBeGreaterThan(0);
      expect(plan.reasons.length).toBeGreaterThan(0);
      expect(plan.weeklyActions.length).toBeGreaterThan(0);
      expect(Number.isFinite(plan.runwayMonths)).toBe(true);
      expect(plan.runwayMonths).toBeGreaterThanOrEqual(0);
    });
  }

  it("مبلغ صغير جدًا = شريحة A ويروح لوحده", () => {
    const plan = computePlan({ ...input, money: 800 }, [metro("a")]);
    expect(plan.tier).toBe("A");
    expect(plan.goAlone).toBe(true);
  });

  it("مبلغ كبير = شريحة D", () => {
    const plan = computePlan(
      { ...input, money: 60000, travellingAlone: false, adults: 2 },
      [metro("a")],
    );
    expect(plan.tier).toBe("D");
  });

  it("دخل شهري من مصر أكبر من المصاريف = runway طويل", () => {
    const plan = computePlan({ ...input, monthlyIncomeFromHome: 9000 }, [metro("a")]);
    expect(plan.runwayMonths).toBe(99);
  });
});

describe("اتجاه محتاج كام؟", () => {
  it("بيطلع المبلغ المطلوب لمدينة ومدة", () => {
    const r = computeRequired(
      {
        metro: "a",
        adults: 1,
        kidsAges: [],
        monthsWithoutWork: 3,
        includeTravel: true,
        monthlyIncomeFromHome: 0,
      },
      [metro("a")],
    );
    expect(r).not.toBeNull();
    expect(r!.totalNeeded).toBeGreaterThan(r!.landingCost);
    expect(r!.breakdown.length).toBeGreaterThan(3);
  });

  it("مدة أطول = مبلغ أكبر", () => {
    const three = computeRequired(
      { metro: "a", adults: 1, kidsAges: [], monthsWithoutWork: 3, includeTravel: true, monthlyIncomeFromHome: 0 },
      [metro("a")],
    )!;
    const six = computeRequired(
      { metro: "a", adults: 1, kidsAges: [], monthsWithoutWork: 6, includeTravel: true, monthlyIncomeFromHome: 0 },
      [metro("a")],
    )!;
    expect(six.totalNeeded).toBeGreaterThan(three.totalNeeded);
  });

  it("الاتجاهين متسقين: المبلغ المطلوب لـن شهر بيدي runway حواليها", () => {
    const need = computeRequired(
      { metro: "a", adults: 1, kidsAges: [], monthsWithoutWork: 4, includeTravel: true, monthlyIncomeFromHome: 0 },
      [metro("a")],
    )!;
    // ⚠️ الاتجاهين لازم يتكلموا نفس اللغة: "المبلغ المطلوب شامل التذاكر"
    // (includeTravel) يقابله "المبلغ اللي معايا شامل التذاكر"
    // (moneyIncludesTravel). التست ده كان بيعدي بالمنطق المقلوب.
    const plan = computePlan(
      { ...input, money: need.totalNeeded, moneyIncludesTravel: true },
      [metro("a")],
    );
    expect(plan.runwayMonths).toBeGreaterThan(3.5);
    expect(plan.runwayMonths).toBeLessThan(4.5);
  });

  it("مدينة مش موجودة = null مش استثناء", () => {
    expect(
      computeRequired(
        { metro: "nope", adults: 1, kidsAges: [], monthsWithoutWork: 3, includeTravel: true, monthlyIncomeFromHome: 0 },
        [metro("a")],
      ),
    ).toBeNull();
  });
});

describe("⚠️ الأحكام الذاتية في الترشيح الحقيقي", () => {
  it("مدينة أغلى بجالية أكبر مبتسبقش مدينة أرخص بفرق واضح", () => {
    const cheap = metro("cheap", {
      roomRent: verified(600),
      arabCommunity: verified(1),
      gigDemand: verified(2),
    });
    const pricey = metro("pricey", {
      roomRent: verified(1400),
      arabCommunity: verified(5),
      gigDemand: verified(5),
    });

    const plan = computePlan(input, [cheap, pricey]);
    expect(plan.recommendedMetros[0]!.slug).toBe("cheap");
  });
});

describe("⚠️ رفض الحسبة من غير الأرقام الأساسية", () => {
  it("مدينة من غير إيجار = مفيش رقم، مش رقم متفائل", () => {
    const noRent = metro("no-rent", { roomRent: nullField });
    const plan = computePlan(input, [noRent]);
    expect(plan.computable).toBe(false);
    expect(plan.missingEssential).toContain("roomRent");
  });

  it("مدينة من غير أكل = مفيش رقم", () => {
    const noFood = metro("no-food", { groceriesPerAdult: nullField });
    const plan = computePlan(input, [noFood]);
    expect(plan.computable).toBe(false);
    expect(plan.missingEssential).toContain("groceriesPerAdult");
  });

  it("الحالة اللي كانت بتكذب: كل الأرقام ناقصة = ٣٠ شهر وهمية", () => {
    const empty = metro("empty", {
      roomRent: nullField,
      apt1br: nullField,
      apt2br: nullField,
      utilities: nullField,
      groceriesPerAdult: nullField,
      monthlyTransitPass: nullField,
      carInsurance: nullField,
      securityDeposit: nullField,
    });
    const plan = computePlan({ ...input, money: 6000 }, [empty]);

    // المحرك لسه بيحسب رقم كبير — ده متوقع لأن البنود اتشالت…
    expect(plan.runwayMonths).toBeGreaterThan(20);
    // …بس بيقول صراحة إن الرقم ده مينفعش يتعرض
    expect(plan.computable).toBe(false);
  });

  it("عيلة: بيدوّر على إيجار الشقة مش الغرفة", () => {
    const noApt = metro("no-apt", { apt2br: nullField });
    const plan = computePlan(
      { ...input, travellingAlone: false, adults: 2, kidsAges: [6, 9], money: 40000 },
      [noApt],
    );
    expect(plan.missingEssential).toContain("apt2br");
  });

  it("كل الأرقام موجودة = الحسبة مسموحة", () => {
    const plan = computePlan(input, [metro("full")]);
    expect(plan.computable).toBe(true);
    expect(plan.missingEssential).toHaveLength(0);
  });

  it("اتجاه محتاج كام؟ بيرفض بنفس القاعدة", () => {
    const r = computeRequired(
      { metro: "x", adults: 1, kidsAges: [], monthsWithoutWork: 3, includeTravel: true, monthlyIncomeFromHome: 0 },
      [metro("x", { roomRent: nullField })],
    );
    expect(r!.computable).toBe(false);
  });
});

describe("⚠️ أرقام المستخدم بتغلب أرقامنا", () => {
  const noRent = metro("no-rent", { roomRent: nullField });

  it("رقم المستخدم بيفك الحسبة المقفولة", () => {
    const blocked = computePlan(input, [noRent]);
    expect(blocked.computable).toBe(false);

    const unblocked = computePlan(input, [noRent], {
      "no-rent": { roomRent: { mode: "custom", value: 650 } },
    });
    expect(unblocked.computable).toBe(true);
    expect(unblocked.missingEssential).toHaveLength(0);
  });

  it('"مش هحتاجه" إجابة كمان — مش نقص بيانات', () => {
    // ساكن عند قريب أول ٣ شهور: الإيجار صفر بقراره مش بجهلنا
    const staying = computePlan(input, [noRent], {
      "no-rent": { roomRent: { mode: "skip" } },
    });
    expect(staying.computable).toBe(true);
  });

  it("رقم المستخدم بيغلب رقم الموقع", () => {
    const site = computePlan(input, [metro("a")]);
    const cheaper = computePlan(input, [metro("a")], {
      a: { roomRent: { mode: "custom", value: 400 } },
    });
    // إيجار أرخص = مصاريف شهرية أقل = فلوسه تقعد أكتر
    expect(cheaper.monthlyBurn).toBeLessThan(site.monthlyBurn);
    expect(cheaper.runwayMonths).toBeGreaterThan(site.runwayMonths);
  });

  it("الاستغناء عن بند بيقلل المصاريف فعلًا", () => {
    const withPhone = computePlan(input, [metro("a")]);
    const without = computePlan(input, [metro("a")], {
      _global: { phone: { mode: "skip" } },
    });
    expect(without.monthlyBurn).toBeLessThan(withPhone.monthlyBurn);
  });

  it("رقم سالب بيتقفل عند صفر مش بيكسر الحسبة", () => {
    const weird = computePlan(input, [metro("a")], {
      a: { roomRent: { mode: "custom", value: -500 } },
    });
    expect(weird.monthlyBurn).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(weird.runwayMonths)).toBe(true);
  });

  it("override لمدينة مبيسربش لمدينة تانية", () => {
    const plan = computePlan(input, [metro("houston"), metro("chicago")], {
      houston: { roomRent: { mode: "custom", value: 400 } },
    });
    const houston = plan.recommendedMetros.find((m) => m.slug === "houston");
    const chicago = plan.recommendedMetros.find((m) => m.slug === "chicago");
    expect(houston!.runwayMonths).toBeGreaterThan(chicago!.runwayMonths);
  });

  it("كل بند في التفصيل بيقول رقمه جه منين", () => {
    const plan = computePlan(input, [metro("a")], {
      a: { roomRent: { mode: "custom", value: 500 }, utilities: { mode: "skip" } },
    });
    const rent = plan.burnBreakdown.find((b) => b.key === "roomRent");
    const utils = plan.burnBreakdown.find((b) => b.key === "utilities");
    expect(rent!.source).toBe("user");
    expect(utils!.source).toBe("skipped");
    expect(plan.burnBreakdown.find((b) => b.key === "groceriesPerAdult")!.source).toBe("site");
  });
});

describe("⚠️ المدينة اللي المستخدم عدّلها بتفضل هي المختارة", () => {
  it("التعديل مبيضيعش لما الترتيب يتغير بسببه", () => {
    // الاتنين إيجارهم ناقص، فالخطة مقفولة في الحالتين
    const a = metro("city-a", { roomRent: nullField });
    const b = metro("city-b", { roomRent: nullField });

    const blocked = computePlan(input, [a, b]);
    expect(blocked.computable).toBe(false);

    // المستخدم كتب إيجار city-b — لازم الخطة تشتغل على city-b
    const fixed = computePlan(input, [a, b], {
      "city-b": { roomRent: { mode: "custom", value: 700 } },
    });
    expect(fixed.chosenMetro).toBe("city-b");
    expect(fixed.computable).toBe(true);
  });

  it("من غير تعديلات، الترتيب العادي هو اللي بيحكم", () => {
    const cheap = metro("cheap", { roomRent: verified(500) });
    const pricey = metro("pricey", { roomRent: verified(1600) });
    expect(computePlan(input, [pricey, cheap]).chosenMetro).toBe("cheap");
  });

  it("التعديلات العامة (طيران، تليفون) مبتغيّرش المدينة المختارة", () => {
    const cheap = metro("cheap", { roomRent: verified(500) });
    const pricey = metro("pricey", { roomRent: verified(1600) });
    const plan = computePlan(input, [pricey, cheap], {
      _global: { phone: { mode: "skip" } },
    });
    expect(plan.chosenMetro).toBe("cheap");
  });
});

describe("⚠️ مدينة مش عارفين أرقامها ممنوع تترشح", () => {
  it("مدينة داتاها فاضية مبتظهرش في الترشيح", () => {
    const known = metro("known", { roomRent: verified(900) });
    const unknown = metro("unknown", {
      roomRent: nullField,
      groceriesPerAdult: nullField,
    });

    const plan = computePlan(input, [known, unknown]);
    expect(plan.recommendedMetros.map((m) => m.slug)).toEqual(["known"]);
    expect(plan.recommendedMetros.every((m) => m.computable)).toBe(true);
  });

  it("الحالة اللي كانت بتنعكس: الفاضية كانت بتزق المعروفة لـ'اتجنبها'", () => {
    // الفاضية مصاريفها بتتحسب أقل من الحقيقة فبتبان أرخص
    const pricey = metro("pricey-but-known", { roomRent: verified(1500) });
    const unknown = metro("unknown", {
      roomRent: nullField,
      groceriesPerAdult: nullField,
    });

    const plan = computePlan(input, [pricey, unknown]);
    expect(plan.recommendedMetros.map((m) => m.slug)).toContain("pricey-but-known");
    expect(plan.avoidMetros.map((m) => m.slug)).not.toContain("pricey-but-known");
  });

  it("مدينة المستخدم ملاها بإيده بتترشح عادي", () => {
    const empty = metro("filled-by-user", {
      roomRent: nullField,
      groceriesPerAdult: nullField,
    });
    const plan = computePlan(input, [empty], {
      "filled-by-user": {
        roomRent: { mode: "custom", value: 650 },
        groceriesPerAdult: { mode: "custom", value: 320 },
      },
    });
    expect(plan.recommendedMetros.map((m) => m.slug)).toEqual(["filled-by-user"]);
  });

  it("مفيش ولا مدينة معروفة = قايمة ترشيح فاضية مش قايمة كاذبة", () => {
    const a = metro("a", { roomRent: nullField, groceriesPerAdult: nullField });
    const b = metro("b", { roomRent: nullField, groceriesPerAdult: nullField });
    const plan = computePlan(input, [a, b]);
    expect(plan.recommendedMetros).toHaveLength(0);
    expect(plan.avoidMetros).toHaveLength(0);
  });
});

describe("قايمة الأرقام الناقصة", () => {
  it("بتاعة المدينة المختارة بس مش كل المدن", () => {
    const chosen = metro("chosen", { utilities: nullField });
    const other = metro("other", {
      roomRent: nullField,
      groceriesPerAdult: nullField,
      utilities: nullField,
      carInsurance: nullField,
    });

    const plan = computePlan(input, [chosen, other]);
    expect(plan.chosenMetro).toBe("chosen");
    expect(plan.unverifiedFields.every((f) => f.startsWith("chosen."))).toBe(true);
    expect(plan.unverifiedFields.some((f) => f.startsWith("other."))).toBe(false);
  });
});

describe("⚠️ اختيار المدينة بيفضّل اللي عندنا أرقامها", () => {
  it("مبيتقفلش على مدينة مجهولة وفيه مدينة معروفة", () => {
    const known = metro("known", { roomRent: verified(1400) });
    const unknown = metro("unknown", {
      roomRent: nullField,
      groceriesPerAdult: nullField,
      utilities: nullField,
      carInsurance: nullField,
    });

    const plan = computePlan(input, [known, unknown]);
    expect(plan.chosenMetro).toBe("known");
    expect(plan.computable).toBe(true);
  });

  it("بس تعديل المستخدم لسه بيغلب", () => {
    const known = metro("known", { roomRent: verified(900) });
    const mine = metro("mine", { roomRent: nullField });
    const plan = computePlan(input, [known, mine], {
      mine: { roomRent: { mode: "custom", value: 600 } },
    });
    expect(plan.chosenMetro).toBe("mine");
  });
});

describe("⚠️ الفواتير مبتتحسبش مرتين", () => {
  const t = () => ({ add: () => {}, list: () => [] });
  const opts = { adults: 1, kidsAges: [], goAlone: true, needsCar: false };

  /** إيجار جاي من مصدر شامل الفواتير (زي HUD Fair Market Rent). */
  const inclusive = metro("inc", {
    roomRent: { ...verified(700), includesUtilities: true },
    utilities: nullField,
  });

  it("الإيجار الشامل بيشيل بند الفواتير من الحسبة", () => {
    const withFlag = monthlyBurn(inclusive, opts, t());
    const plain = monthlyBurn(
      metro("plain", { roomRent: verified(700), utilities: verified(150) }),
      opts,
      t(),
    );
    expect(plain.total - withFlag.total).toBe(150);

    const row = withFlag.breakdown.find((r) => r.key === "utilities");
    expect(row?.amount).toBe(0);
    // مش "ناقص" — دي معلومة، والمستخدم لازم يشوف السبب
    expect(row?.incomplete).toBe(false);
    expect(row?.basis?.ar).toContain("شامل");
  });

  it("بند فواتير ناقص مع إيجار شامل مبيتسجلش كحقل ناقص", () => {
    const missing: string[] = [];
    const tracker = { add: (_m: string, f: string) => void missing.push(f), list: () => missing };
    monthlyBurn(inclusive, opts, tracker);
    expect(missing).not.toContain("utilities");
  });

  it("أول ما المستخدم يحط إيجاره بنفسه، الفواتير بترجع", () => {
    // رقم من إعلان فعلي غالبًا من غير فواتير — فالعلامة بتاعتنا مبقتش سارية
    const overrides = { inc: { roomRent: { mode: "custom" as const, value: 700 } } };
    const withUserRent = monthlyBurn(
      metro("inc", {
        roomRent: { ...verified(700), includesUtilities: true },
        utilities: verified(150),
      }),
      opts,
      t(),
      overrides,
    );
    expect(withUserRent.breakdown.find((r) => r.key === "utilities")?.amount).toBe(150);
  });

  it("تكلفة الوصول كمان مبتحسبش فواتير أول شهر مرتين", () => {
    const landing = landingCost(
      inclusive,
      { adults: 1, kidsAges: [], goAlone: true, includeTravel: false, hostNights: 0 },
      t(),
    );
    expect(landing.breakdown.find((r) => r.key === "utilities")?.amount).toBe(0);
  });
});

describe("⚠️ الأرقام العامة جاية من المحتوى مش من الكود", () => {
  it("كل بند عام معاه حالته وbasis بتاعه", () => {
    const landing = landingCost(
      metro("x"),
      { adults: 1, kidsAges: [], goAlone: true, includeTravel: true, hostNights: 0 },
      { add: () => {}, list: () => [] },
    );
    const travel = landing.breakdown.find((r) => r.key === "travel");
    // من غير الحتة دي، رقم مخترع بيتعرض للمستخدم كإنه حقيقة مؤكدة
    expect(travel?.estimated).toBe(true);
    expect(travel?.basis?.ar.length ?? 0).toBeGreaterThan(0);
    expect(travel?.basis?.en.length ?? 0).toBeGreaterThan(0);
  });
});

describe("⚠️ وحدة التأمين: رقمنا مضاعف ورقم المستخدم دولار", () => {
  const t = () => ({ add: () => {}, list: () => [] });
  const opts = {
    adults: 1,
    kidsAges: [] as number[],
    goAlone: true,
    includeTravel: false,
    hostNights: 0,
  };

  it("رقمنا بيتضرب في الإيجار", () => {
    const m = metro("x", { roomRent: verified(1200), securityDeposit: verified(1) });
    const row = landingCost(m, opts, t()).breakdown.find(
      (r) => r.key === "securityDeposit",
    );
    expect(row?.amount).toBe(1200);
  });

  it("رقم المستخدم بيتاخد زي ما هو — مش بيتضرب", () => {
    // الباج القديم: 1400 × إيجار 1200 = 1,680,000 وإجمالي وصول بالمليون
    const m = metro("x", { roomRent: verified(1200), securityDeposit: verified(1) });
    const overrides = { x: { securityDeposit: { mode: "custom" as const, value: 1400 } } };
    const row = landingCost(m, opts, t(), overrides).breakdown.find(
      (r) => r.key === "securityDeposit",
    );
    expect(row?.amount).toBe(1400);
  });

  it("مفيش بند في تكلفة الوصول بيطلع أكبر من مليون برقم معقول", () => {
    const m = metro("x", { roomRent: verified(1200), securityDeposit: verified(1) });
    const overrides = { x: { securityDeposit: { mode: "custom" as const, value: 1400 } } };
    const { total } = landingCost(m, opts, t(), overrides);
    expect(total).toBeLessThan(20_000);
  });
});

describe("⚠️ سطر العربية بيعرض حاجتين، فرقم المستخدم لازم يغطي السطر كله", () => {
  const t = () => ({ add: () => {}, list: () => [] });
  const opts = { adults: 1, kidsAges: [] as number[], goAlone: true, needsCar: true };
  const carRow = (over?: Parameters<typeof monthlyBurn>[3]) =>
    monthlyBurn(metro("x", { carInsurance: verified(200) }), opts, t(), over).breakdown.find(
      (r) => r.key === "carInsurance",
    );

  it("رقمنا إحنا: التأمين + البنزين", () => {
    // 200 تأمين + 120 بنزين
    expect(carRow()?.amount).toBe(320);
  });

  it("المستخدم كتب صفر → صفر، مش ١٢٠", () => {
    // الباج القديم: كتب 0 وشاف 120 لأن البنزين كان بيتضاف فوق رقمه
    const row = carRow({ x: { carInsurance: { mode: "custom", value: 0 } } });
    expect(row?.amount).toBe(0);
  });

  it("المستخدم كتب رقمه → رقمه زي ما هو", () => {
    const row = carRow({ x: { carInsurance: { mode: "custom", value: 250 } } });
    expect(row?.amount).toBe(250);
  });

  it('"مش هحتاجه" → صفر', () => {
    const row = carRow({ x: { carInsurance: { mode: "skip" } } });
    expect(row?.amount).toBe(0);
  });
});

describe("⚠️ اتجاه سؤال تذاكر الطيران", () => {
  const one = [metro("a")];

  it('"المبلغ شامل التذاكر" = نعم → التذاكر بتتخصم', () => {
    const withT = computePlan({ ...input, moneyIncludesTravel: true }, one);
    const row = withT.landingBreakdown.find((r) => r.key === "travel");
    expect(row?.amount).toBeGreaterThan(0);
  });

  it('"المبلغ شامل التذاكر" = لأ → متتخصمش', () => {
    const noT = computePlan({ ...input, moneyIncludesTravel: false }, one);
    expect(noT.landingBreakdown.find((r) => r.key === "travel")?.amount).toBe(0);
  });

  it("واللي بيقول نعم تكلفة وصوله أعلى — مش أقل", () => {
    const yes = computePlan({ ...input, moneyIncludesTravel: true }, one);
    const no = computePlan({ ...input, moneyIncludesTravel: false }, one);
    expect(yes.landingCost).toBeGreaterThan(no.landingCost);
  });
});

describe("⚠️ اختيار المدينة أو الولاية", () => {
  const pool = [
    metro("tx-1", { state: "TX" }),
    metro("tx-2", { state: "TX" }),
    metro("ca-1", { state: "CA" }),
  ];

  it("من غير اختيار، كل المدن داخلة الترشيح", () => {
    const p = computePlan(input, pool);
    expect(p.recommendedMetros.length).toBeGreaterThan(1);
  });

  it("اختار مدينة → الخطة عليها هي", () => {
    const p = computePlan({ ...input, targetMetro: "ca-1" }, pool);
    expect(p.chosenMetro).toBe("ca-1");
    expect(p.recommendedMetros.every((m) => m.slug === "ca-1")).toBe(true);
  });

  it("اختار ولاية → الترشيح جوه الولاية بس", () => {
    const p = computePlan({ ...input, targetState: "TX" }, pool);
    expect(p.recommendedMetros.every((m) => m.slug.startsWith("tx-"))).toBe(true);
    expect(p.chosenMetro.startsWith("tx-")).toBe(true);
  });

  it("اختيار مش موجود مبيوقفش الخطة", () => {
    // القاعدة الأولى في المحرك: لازم يطلع خطة دايمًا
    const p = computePlan({ ...input, targetMetro: "nope" }, pool);
    expect(p.chosenMetro).toBeTruthy();
  });
});

describe("⚠️ سؤال العربية", () => {
  const one = [metro("a", { carNeed: verified(2) })];

  it('"هجيب عربية" بتغلب حاجة المدينة', () => {
    const yes = computePlan({ ...input, willBuyCar: "yes" }, one);
    const no = computePlan({ ...input, willBuyCar: "no" }, one);
    expect(yes.monthlyBurn).toBeGreaterThan(no.monthlyBurn);
  });

  it('"مش عارف" بيدي الخطتين مش واحدة', () => {
    const p = computePlan({ ...input, willBuyCar: "unsure" }, one);
    expect(p.carScenarios).not.toBeNull();
    expect(p.carScenarios!.withCar.monthlyBurn).toBeGreaterThan(
      p.carScenarios!.withoutCar.monthlyBurn,
    );
    // العربية بتقصّر عمر الفلوس
    expect(p.carScenarios!.withCar.runwayMonths).toBeLessThan(
      p.carScenarios!.withoutCar.runwayMonths,
    );
  });

  it("من غير إجابة، المدينة هي اللي بتقرر زي الأول", () => {
    const p = computePlan(input, one);
    expect(p.carScenarios).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * افتراضات الدخل في الرسم البياني
 *
 * ⚠️ الرقم الكبير ("فلوسك تكفي X شهر") محسوب بدخل **صفر**، والرسمة
 * تحته كانت بترسم خط بيعلّي الرصيد بـ$900 مكتوبين في الكود من غير ما
 * الواجهة تقول إن فيه دخل مفترض. الtests دي بتثبت التلات حاجات اللي
 * لازم يفضلوا صح: البطيء بدون دخل خالص، الدخل بيبدأ في شهره المحدد،
 * ورقم المستخدم بيغلب تقديرنا.
 * ------------------------------------------------------------------ */
describe("افتراضات الدخل في المسار الشهري", () => {
  const metros = [metro("houston-tx")];

  it("السيناريو البطيء مفيهوش أي دخل — بينزل بنفس المقدار كل شهر", () => {
    const plan = computePlan({ ...input, money: 30_000 }, metros);
    const p = plan.monthlyProjection;
    const firstStep = p[0]!.slow - p[1]!.slow;

    for (let i = 1; i < p.length - 1; i++) {
      expect(p[i]!.slow - p[i + 1]!.slow).toBeCloseTo(firstStep, 0);
    }
  });

  it("الدخل بيبدأ في الشهر المحدد — الشهر الأول زي البطيء بالظبط", () => {
    const plan = computePlan({ ...input, money: 30_000 }, metros);
    const start = plan.incomeAssumption.startsInMonth;
    const before = plan.monthlyProjection.filter((m) => m.month < start);

    // قبل ما الدخل يبدأ، التلات سيناريوهات لازم يبقوا رقم واحد
    for (const m of before) {
      expect(m.expected).toBe(m.slow);
      expect(m.fast).toBe(m.slow);
    }
    expect(before.length).toBeGreaterThan(0);
  });

  it("رقم المستخدم بيغلب تقديرنا وبيتعلّم إنه بتاعه", () => {
    const ours = computePlan({ ...input, money: 30_000 }, metros);
    const mine = computePlan(
      { ...input, money: 30_000, expectedMonthlyIncome: 2000 },
      metros,
    );

    expect(ours.incomeAssumption.fromUser).toBe(false);
    expect(mine.incomeAssumption.fromUser).toBe(true);
    expect(mine.incomeAssumption.expected).toBe(2000);

    // نفس الشهر، الفرق بالظبط = فرق الدخل × عدد شهور الكسب
    const start = mine.incomeAssumption.startsInMonth;
    const m6 = 6;
    const earning = m6 - (start - 1);
    const oursAt6 = ours.monthlyProjection.find((m) => m.month === m6)!;
    const mineAt6 = mine.monthlyProjection.find((m) => m.month === m6)!;

    expect(mineAt6.expected - oursAt6.expected).toBeCloseTo(
      (2000 - ours.incomeAssumption.expected) * earning,
      0,
    );
    // والبطيء ما يتأثرش — هو مالوش دخل أصلًا
    expect(mineAt6.slow).toBe(oursAt6.slow);
  });

  it("رقم مش صالح بيرجّعنا لتقديرنا بدل ما يكسر الرسمة", () => {
    for (const bad of [0, -500, Number.NaN]) {
      const plan = computePlan(
        { ...input, money: 30_000, expectedMonthlyIncome: bad },
        metros,
      );
      expect(plan.incomeAssumption.fromUser).toBe(false);
      expect(Number.isFinite(plan.incomeAssumption.expected)).toBe(true);
      expect(plan.monthlyProjection.every((m) => Number.isFinite(m.expected))).toBe(
        true,
      );
    }
  });

  it("السريع دايمًا فوق المتوقع، والمتوقع فوق البطيء", () => {
    const plan = computePlan(
      { ...input, money: 30_000, expectedMonthlyIncome: 1500 },
      metros,
    );
    for (const m of plan.monthlyProjection) {
      expect(m.fast).toBeGreaterThanOrEqual(m.expected);
      expect(m.expected).toBeGreaterThanOrEqual(m.slow);
    }
  });
});


/* ------------------------------------------------------------------ *
 * تمن العربية بيتخصم من الكاش
 * ------------------------------------------------------------------ */
describe("مقارنة العربية بتحسب تمن الشرا", () => {
  const metros = [metro("houston-tx", { carNeed: verified(5) })];
  const unsure: PlannerInput = {
    ...input,
    money: 25_000,
    willBuyCar: "unsure",
  };

  it("الرصيد بعربية أقل من غيرها بفرق أكبر من فرق المصاريف الشهرية", () => {
    const plan = computePlan(unsure, metros);
    const sc = plan.carScenarios!;

    // لو التمن مكانش بيتخصم، الفرق كان هيبقى من فرق المصاريف بس
    const burnOnlyRunway =
      (sc.withoutCar.runwayMonths * sc.withoutCar.monthlyBurn) / sc.withCar.monthlyBurn;

    expect(sc.withCar.runwayMonths).toBeLessThan(burnOnlyRunway - 0.5);
    expect(sc.withCar.upfront).toBeGreaterThan(0);
    expect(sc.withoutCar.upfront).toBe(0);
  });

  it("الفرق بين الرصيدين بيساوي تمن العربية مقسوم على المصاريف الشهرية", () => {
    const plan = computePlan(unsure, metros);
    const sc = plan.carScenarios!;

    const cashWithout = sc.withoutCar.runwayMonths * sc.withoutCar.monthlyBurn;
    const cashWith = sc.withCar.runwayMonths * sc.withCar.monthlyBurn;

    expect(cashWithout - cashWith).toBeCloseTo(sc.withCar.upfront, 0);
  });

  it("مش قادر على تمنها = رصيد صفر مش رقم بالسالب", () => {
    const broke = computePlan({ ...unsure, money: 6_000 }, metros);
    const sc = broke.carScenarios!;
    expect(sc.withCar.runwayMonths).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(sc.withCar.runwayMonths)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * تذاكر السفر بالسن
 * ------------------------------------------------------------------ */
describe("تذاكر السفر بتتحسب بسن كل مسافر", () => {
  const m = metro("houston-tx");
  const tracker = () => {
    const seen: string[] = [];
    return { add: (_m: string, f: string) => void seen.push(f), list: () => seen };
  };
  const withTravel = (kidsAges: number[]) =>
    landingCost(
      m,
      { adults: 2, kidsAges, goAlone: false, includeTravel: true, hostNights: 0 },
      tracker(),
    ).breakdown.find((b) => b.key === "travel")!.amount;

  it("الرضيع (أقل من سنتين) أرخص من الطفل", () => {
    expect(withTravel([1])).toBeLessThan(withTravel([8]));
  });

  it("١٢ سنة فما فوق بيدفع تذكرة بالغ", () => {
    const teen = withTravel([14]);
    const child = withTravel([8]);
    const noKids = withTravel([]);
    expect(teen).toBeGreaterThan(child);
    expect(teen - noKids).toBeCloseTo((noKids / 2), 0); // تذكرة بالغ كاملة
  });

  it("السن ١١ و١٢ مش نفس التمن — الحد بيشتغل", () => {
    expect(withTravel([12])).toBeGreaterThan(withTravel([11]));
  });

  it("سن ١ وسن ٢ مش نفس التمن — حد الرضيع بيشتغل", () => {
    expect(withTravel([2])).toBeGreaterThan(withTravel([1]));
  });

  it("مفيش تذاكر خالص لما المبلغ مش شامل السفر", () => {
    const amount = landingCost(
      m,
      { adults: 2, kidsAges: [1, 8, 14], goAlone: false, includeTravel: false, hostNights: 0 },
      tracker(),
    ).breakdown.find((b) => b.key === "travel")!.amount;
    expect(amount).toBe(0);
  });
});

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
    const plan = computePlan({ ...input, money: need.totalNeeded }, [metro("a")]);
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

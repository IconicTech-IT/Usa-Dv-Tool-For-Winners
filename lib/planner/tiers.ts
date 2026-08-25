import type { Tier } from "@/lib/types";

/**
 * قواعد كل شريحة ميزانية، مكتوبة كـdata مش كـif/else متشعبة —
 * عشان تتقرا وتتعدل وتتختبر بسهولة.
 *
 * ⚠️ القاعدة الحاكمة: الأداة لازم تطلع خطة لأي مبلغ.
 * ممنوع تقول "المبلغ مش كفاية" وتقف. دايمًا في مسار،
 * حتى لو مسار صعب — بس اتكلم بصراحة عن مخاطره.
 */

export interface TierPolicy {
  tier: Tier;
  runway: [number, number];      // بالشهور
  goAloneFirst: "almost-always" | "usually" | "optional" | "no";
  housing: "room-share" | "shared-apartment" | "small-apartment";
  carTiming: "delay-or-rent" | "6-8-weeks" | "month-1";
  incomeDeadlineWeeks: number;
  metroWeights: Record<string, number>;
  mentionEnterAndReturn: boolean;
}

export const TIERS: TierPolicy[] = [
  {
    tier: "A",
    runway: [0, 1.5],
    goAloneFirst: "almost-always",
    housing: "room-share",
    carTiming: "delay-or-rent",
    incomeDeadlineWeeks: 2,
    metroWeights: {
      hostPresence: 5, lowCost: 4, gigDemand: 3,
      worksWithoutCar: 3, worksWithoutEnglish: 2,
      winterPenalty: 2, schools: 0, career: 0,
    },
    // خيار حقيقي وناس بتعمله: يدخل يفعّل وضعه ويرجع يجهز.
    // اعرضه بحياد مع كل اعتباراته والمصادر الرسمية، من غير ما توصي بيه.
    mentionEnterAndReturn: true,
  },
  {
    tier: "B",
    runway: [1.5, 3],
    goAloneFirst: "usually",
    housing: "room-share",
    carTiming: "6-8-weeks",
    incomeDeadlineWeeks: 4,
    metroWeights: {
      hostPresence: 4, lowCost: 4, gigDemand: 4,
      worksWithoutCar: 2, worksWithoutEnglish: 2,
      winterPenalty: 1, schools: 0, career: 1,
    },
    mentionEnterAndReturn: true,
  },
  {
    tier: "C",
    runway: [3, 6],
    goAloneFirst: "optional",
    housing: "shared-apartment",
    carTiming: "month-1",
    incomeDeadlineWeeks: 8,
    metroWeights: {
      hostPresence: 3, lowCost: 3, gigDemand: 3,
      worksWithoutCar: 1, worksWithoutEnglish: 1,
      winterPenalty: 1, schools: 2, career: 2,
    },
    mentionEnterAndReturn: false,
  },
  {
    tier: "D",
    runway: [6, Infinity],
    goAloneFirst: "no",
    housing: "small-apartment",
    carTiming: "month-1",
    incomeDeadlineWeeks: 12,
    metroWeights: {
      hostPresence: 2, lowCost: 1, gigDemand: 1,
      worksWithoutCar: 0, worksWithoutEnglish: 0,
      winterPenalty: 0, schools: 4, career: 4,
    },
    mentionEnterAndReturn: false,
  },
];

export function tierFor(runwayMonths: number): TierPolicy {
  // ⚠️ runway سالب (المصاريف أكبر من الفلوس) بيروح لأصعب شريحة مش لأسهل واحدة.
  const match = TIERS.find(
    (t) => runwayMonths >= t.runway[0] && runwayMonths < t.runway[1],
  );
  return match ?? TIERS[0]!;
}

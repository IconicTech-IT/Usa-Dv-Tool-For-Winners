import { describe, expect, it } from "vitest";
import {
  JUDGMENT_CAP,
  capJudgment,
  judgmentDidNotFlipTop,
  rankWithJudgment,
} from "@/lib/planner/judgment";

describe("سقف الأحكام في الscore المعروض", () => {
  it("نصيب الأحكام مبيعديش السقف مهما كان الرقم كبير", () => {
    const { score, judgmentContribution, capped } = capJudgment({
      factual: 100,
      judgment: 500,
    });
    expect(capped).toBe(true);
    expect(judgmentContribution / score).toBeLessThanOrEqual(JUDGMENT_CAP + 1e-9);
  });

  it("لو الأحكام تحت السقف بتعدي زي ما هي", () => {
    const { judgmentContribution, capped } = capJudgment({
      factual: 100,
      judgment: 5,
    });
    expect(capped).toBe(false);
    expect(judgmentContribution).toBe(5);
  });
});

describe("الترتيب: الحقايق بترتب والأحكام بتفصل بين المتعادلين", () => {
  it("⚠️ حكم ذاتي لوحده ميقلبش المدينة الأولى", () => {
    // فرق حقيقي واضح (١٢٪) + حكم ذاتي مرتفع جدًا للمدينة التانية
    const cities = [
      { slug: "cheap-city", factual: 100, judgment: 0 },
      { slug: "big-community-city", factual: 88, judgment: 999 },
    ];
    expect(rankWithJudgment(cities)[0]!.slug).toBe("cheap-city");
    expect(judgmentDidNotFlipTop(cities)).toBe(true);
  });

  it("السقف لوحده مكانش بيكفي — دي الحالة اللي كسرته", () => {
    // فرق ١٢٪ في الحقايق أقل من سقف ١٥٪، فالجمع كان بيقلب الترتيب.
    const a = capJudgment({ factual: 100, judgment: 0 });
    const b = capJudgment({ factual: 88, judgment: 999 });
    expect(b.score).toBeGreaterThan(a.score); // الجمع بيقلبها…

    // …والترتيب الصح مبيقلبهاش
    const ranked = rankWithJudgment([
      { slug: "a", factual: 100, judgment: 0 },
      { slug: "b", factual: 88, judgment: 999 },
    ]);
    expect(ranked[0]!.slug).toBe("a");
  });

  it("✅ بس بترجّح بين مدينتين متقاربين", () => {
    const ranked = rankWithJudgment([
      { slug: "slightly-better", factual: 100, judgment: 1 },
      { slug: "tied-bigger-community", factual: 98, judgment: 9 },
    ]);
    expect(ranked[0]!.slug).toBe("tied-bigger-community");
    expect(judgmentDidNotFlipTop(ranked)).toBe(true);
  });

  it("بترتب كل المدن مرة واحدة من غير ما تفقد ولا مدينة", () => {
    const cities = [
      { slug: "a", factual: 100, judgment: 1 },
      { slug: "b", factual: 99, judgment: 5 },
      { slug: "c", factual: 70, judgment: 99 },
      { slug: "d", factual: 68, judgment: 0 },
    ];
    const ranked = rankWithJudgment(cities);
    expect(ranked.map((c) => c.slug)).toEqual(["b", "a", "c", "d"]);
    expect(ranked).toHaveLength(cities.length);
  });
});

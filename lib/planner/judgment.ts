/**
 * أحكام الترتيب الذاتي في محرك الخطة.
 *
 * `arabCommunity` و `gigDemand` أحكام شخصية مش قياسات — مفيش مصدر بيرتب
 * المدن رقميًا على المحورين دول. فالقاعدة:
 *
 *   ✅ مسموح ترجّح بين مدينتين **متقاربين في الحقايق**
 *   ❌ ممنوع تقلب ترشيح مدينة لوحدها
 *
 * ⚠️ سقف على الوزن **مش كفاية** لوحده عشان يضمن ده: مدينة حقايقها أقل
 * بـ١٢٪ ممكن لسه تتقدم لو السقف ١٥٪. عشان كده الترتيب هنا **مش** بجمع
 * الscores — بيتم على مرحلتين:
 *
 *   ١. رتّب بالحقايق.
 *   ٢. المدن اللي فرقها في الحقايق أقل من `JUDGMENT_TIE_BAND` تعتبر
 *      متعادلة، والأحكام الذاتية بترتب **جوه** المجموعة المتعادلة بس.
 *
 * كده الحكم الذاتي ميقدرش ينقل مدينة من تحت لفوق مهما كان رقمه.
 */

/** فرق في الحقايق أقل من كده = تعادل، والحكم الذاتي هو اللي بيفصل. */
export const JUDGMENT_TIE_BAND = 0.05;

/** أقصى نصيب للأحكام الذاتية من الscore المعروض (للعرض بس، مش للترتيب). */
export const JUDGMENT_CAP = 0.15;

/** الحقول اللي حالتها judgment ومسموح لها تدخل الترتيب. */
export const JUDGMENT_FIELDS = ["arabCommunity", "gigDemand"] as const;
export type JudgmentField = (typeof JUDGMENT_FIELDS)[number];

export interface ScoreParts {
  /** مساهمة الحقايق (تكاليف، مواصلات، ضرايب…) */
  factual: number;
  /** مساهمة الأحكام الذاتية */
  judgment: number;
}

/**
 * بيطبق السقف على نصيب الأحكام في الscore **المعروض**.
 * الترتيب نفسه بيتحدد بـ`rankWithJudgment` مش بالرقم ده.
 */
export function capJudgment(parts: ScoreParts): {
  score: number;
  judgmentContribution: number;
  capped: boolean;
} {
  const factual = Math.max(0, parts.factual);
  const raw = Math.max(0, parts.judgment);

  const maxJudgment = (JUDGMENT_CAP / (1 - JUDGMENT_CAP)) * factual;
  const judgment = Math.min(raw, maxJudgment);

  return {
    score: factual + judgment,
    judgmentContribution: judgment,
    capped: judgment < raw,
  };
}

/**
 * الترتيب النهائي للمدن. ده اللي المحرك بيستخدمه.
 *
 * الحقايق بترتب، والأحكام الذاتية بتفصل بين المتعادلين بس.
 */
export function rankWithJudgment<T extends ScoreParts>(cities: T[]): T[] {
  const byFactual = [...cities].sort((a, b) => b.factual - a.factual);
  if (byFactual.length < 2) return byFactual;

  const top = byFactual[0]!.factual;
  const bandWidth = Math.abs(top) * JUDGMENT_TIE_BAND;

  const out: T[] = [];
  let group: T[] = [];

  const flush = () => {
    group.sort((a, b) => b.judgment - a.judgment);
    out.push(...group);
    group = [];
  };

  for (const city of byFactual) {
    const anchor = group[0];
    if (anchor && anchor.factual - city.factual > bandWidth) flush();
    group.push(city);
  }
  flush();

  return out;
}

/**
 * تأكيد إن الأحكام الذاتية مقلبتش الترشيح.
 * المدينة الأولى بعد الترتيب لازم تكون متعادلة في الحقايق مع أحسن مدينة.
 */
export function judgmentDidNotFlipTop<T extends ScoreParts>(cities: T[]): boolean {
  if (cities.length < 2) return true;

  const ranked = rankWithJudgment(cities);
  const bestFactual = Math.max(...cities.map((c) => c.factual));
  const chosen = ranked[0]!.factual;

  return bestFactual - chosen <= Math.abs(bestFactual) * JUDGMENT_TIE_BAND;
}

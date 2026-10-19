/** A translate function with the root of the messages (`getTranslations()` gives one). */
export type Translate = (key: string, values?: Record<string, string>) => string;

export interface GuideText {
  title: string;
  lead: string;
  steps: string[];
}

type GuideKind = "food" | "health" | "generic";

/** Items with their own wording; every other item uses the general wording. */
const KIND_BY_ITEM: Record<string, GuideKind> = {
  food: "food",
  healthInsurance: "health",
  healthInsuranceStart: "health",
};

export function guideKind(itemId: string): GuideKind {
  return KIND_BY_ITEM[itemId] ?? "generic";
}

/** Title, lead and the three steps of the guide page of one cost item. */
export function guideText(t: Translate, itemId: string): GuideText {
  const kind = guideKind(itemId);
  if (kind === "generic") {
    return {
      title: t("guide.titleFor", { item: t(`calc.items.${itemId}`) }),
      lead: t("guide.genericLead"),
      steps: [t("guide.genericStep1"), t("guide.genericStep2"), t("guide.genericStep3")],
    };
  }
  const namespace = kind === "food" ? "guide" : "guideHealth";
  return {
    title: t(`${namespace}.title`),
    lead: t(`${namespace}.lead`),
    steps: [t(`${namespace}.step1`), t(`${namespace}.step2`), t(`${namespace}.step3`)],
  };
}

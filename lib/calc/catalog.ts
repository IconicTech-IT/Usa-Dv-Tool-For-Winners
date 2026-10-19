/**
 * The list of cost items. Only ids, stage, grouping and how an amount scales with
 * the household. There are NO amounts here: the user types every number.
 * Labels and guide links live in the messages and the guide pages.
 */

export type Stage = "beforeInterview" | "atInterview" | "beforeTravel" | "firstMonth" | "monthly";

/** Order matters: the cumulative timeline follows it. */
export const STAGES: readonly Stage[] = [
  "beforeInterview",
  "atInterview",
  "beforeTravel",
  "firstMonth",
  "monthly",
] as const;

/** How the typed amount scales with the household. */
export type Scaling = "total" | "perPerson" | "perAdult" | "perChild";

/** Which calculator an item belongs to. */
export type Calculator = "fees" | "moving" | "monthly";

export type GroupId =
  | "paperwork"
  | "travel"
  | "housingStart"
  | "household"
  | "connectivity"
  | "car"
  | "healthFamily"
  | "otherMoving"
  | "monthlyCosts";

export interface ItemDef {
  id: string;
  calculator: Calculator;
  group: GroupId;
  stage: Stage;
  scaling: Scaling;
  /** The user may switch this item between "whole household" and "per person" (default: whole household). */
  toggle?: boolean;
}

interface ItemOptions {
  scaling?: Scaling;
  toggle?: boolean;
}

function define(
  calculator: Calculator,
  id: string,
  where: { group: GroupId; stage: Stage },
  options: ItemOptions,
): ItemDef {
  const { scaling = "total", toggle = false } = options;
  const base = { id, calculator, group: where.group, stage: where.stage, scaling };
  return toggle ? { ...base, toggle } : base;
}

const fees = (id: string, group: GroupId, stage: Stage, options: ItemOptions = {}) =>
  define("fees", id, { group, stage }, options);
const moving = (id: string, group: GroupId, stage: Stage, options: ItemOptions = {}) =>
  define("moving", id, { group, stage }, options);
const monthly = (id: string, group: GroupId, stage: Stage, options: ItemOptions = {}) =>
  define("monthly", id, { group, stage }, options);

export const ITEMS: readonly ItemDef[] = [
  /* Paperwork and fees */
  fees("medicalExam", "paperwork", "beforeInterview", { scaling: "perPerson" }),
  fees("policeCertificate", "paperwork", "beforeInterview", { scaling: "perAdult" }),
  fees("translation", "paperwork", "beforeInterview"),
  fees("civilCertificates", "paperwork", "beforeInterview"),
  fees("militaryCertificate", "paperwork", "beforeInterview"),
  fees("photos", "paperwork", "beforeInterview", { scaling: "perPerson" }),
  fees("otherPaperwork", "paperwork", "beforeInterview"),
  fees("visaFee", "paperwork", "atInterview", { scaling: "perPerson" }),
  fees("interviewTravel", "paperwork", "atInterview"),
  fees("passportCourier", "paperwork", "beforeTravel"),
  fees("immigrantFee", "paperwork", "beforeTravel", { scaling: "perPerson" }),

  /* Travel */
  fees("ticket", "travel", "beforeTravel", { scaling: "perPerson" }),
  fees("excessBaggage", "travel", "beforeTravel"),
  fees("travelInsurance", "travel", "beforeTravel", { toggle: true }),

  /* Moving and settling (first month there) */
  moving("temporaryStay", "housingStart", "firstMonth"),
  moving("applicationFees", "housingStart", "firstMonth"),
  moving("securityDeposit", "housingStart", "firstMonth"),
  moving("firstMonthRent", "housingStart", "firstMonth"),
  moving("furniture", "household", "firstMonth"),
  moving("winterClothes", "household", "firstMonth", { scaling: "perPerson" }),
  moving("householdBasics", "household", "firstMonth"),
  moving("utilityDeposits", "connectivity", "firstMonth"),
  moving("phoneLine", "connectivity", "firstMonth", { scaling: "perAdult" }),
  moving("licenseTests", "car", "firstMonth", { scaling: "perAdult" }),
  moving("carPurchase", "car", "firstMonth"),
  moving("carInsuranceStart", "car", "firstMonth"),
  moving("carRegistration", "car", "firstMonth"),
  moving("healthInsuranceStart", "healthFamily", "firstMonth", { toggle: true }),
  moving("childcareStart", "healthFamily", "firstMonth"),
  moving("otherMoving", "otherMoving", "firstMonth"),

  /* Monthly running costs */
  monthly("rent", "monthlyCosts", "monthly"),
  monthly("utilities", "monthlyCosts", "monthly"),
  monthly("internet", "monthlyCosts", "monthly"),
  monthly("phone", "monthlyCosts", "monthly"),
  monthly("food", "monthlyCosts", "monthly"),
  monthly("transport", "monthlyCosts", "monthly"),
  monthly("healthInsurance", "monthlyCosts", "monthly", { toggle: true }),
  monthly("carInsurance", "monthlyCosts", "monthly"),
  monthly("childcare", "monthlyCosts", "monthly"),
  monthly("otherMonthly", "monthlyCosts", "monthly"),
];

/**
 * Quick mode: five big boxes, one per stage. Each amount is the whole household's
 * total for that stage (a quick estimate typed by the user).
 */
export const QUICK_ITEMS: readonly ItemDef[] = [
  {
    id: "quickBeforeInterview",
    calculator: "fees",
    group: "paperwork",
    stage: "beforeInterview",
    scaling: "total",
  },
  { id: "quickAtInterview", calculator: "fees", group: "paperwork", stage: "atInterview", scaling: "total" },
  { id: "quickBeforeTravel", calculator: "fees", group: "travel", stage: "beforeTravel", scaling: "total" },
  {
    id: "quickFirstMonth",
    calculator: "moving",
    group: "housingStart",
    stage: "firstMonth",
    scaling: "total",
  },
  { id: "quickMonthly", calculator: "monthly", group: "monthlyCosts", stage: "monthly", scaling: "total" },
];

export function itemsOfCalculator(calculator: Calculator): ItemDef[] {
  return ITEMS.filter((i) => i.calculator === calculator);
}

export function findItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id) ?? QUICK_ITEMS.find((i) => i.id === id);
}

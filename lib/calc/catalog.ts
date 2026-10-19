/**
 * The list of cost items. Only ids, stage, grouping and how an amount scales with
 * the household. There are NO amounts here: the user types every number.
 * Labels and guide links live in the messages and the guide pages.
 */

export type Stage =
  | "beforeInterview"
  | "atInterview"
  | "beforeTravel"
  | "firstMonth"
  | "monthly";

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

function item(
  id: string,
  calculator: Calculator,
  group: GroupId,
  stage: Stage,
  scaling: Scaling = "total",
  toggle = false,
): ItemDef {
  return toggle ? { id, calculator, group, stage, scaling, toggle } : { id, calculator, group, stage, scaling };
}

export const ITEMS: readonly ItemDef[] = [
  /* Paperwork and fees */
  item("medicalExam", "fees", "paperwork", "beforeInterview", "perPerson"),
  item("policeCertificate", "fees", "paperwork", "beforeInterview", "perAdult"),
  item("translation", "fees", "paperwork", "beforeInterview"),
  item("civilCertificates", "fees", "paperwork", "beforeInterview"),
  item("militaryCertificate", "fees", "paperwork", "beforeInterview"),
  item("photos", "fees", "paperwork", "beforeInterview", "perPerson"),
  item("otherPaperwork", "fees", "paperwork", "beforeInterview"),
  item("visaFee", "fees", "paperwork", "atInterview", "perPerson"),
  item("interviewTravel", "fees", "paperwork", "atInterview"),
  item("passportCourier", "fees", "paperwork", "beforeTravel"),
  item("immigrantFee", "fees", "paperwork", "beforeTravel", "perPerson"),

  /* Travel */
  item("ticket", "fees", "travel", "beforeTravel", "perPerson"),
  item("excessBaggage", "fees", "travel", "beforeTravel"),
  item("travelInsurance", "fees", "travel", "beforeTravel", "total", true),

  /* Moving and settling (first month there) */
  item("temporaryStay", "moving", "housingStart", "firstMonth"),
  item("applicationFees", "moving", "housingStart", "firstMonth"),
  item("securityDeposit", "moving", "housingStart", "firstMonth"),
  item("firstMonthRent", "moving", "housingStart", "firstMonth"),
  item("furniture", "moving", "household", "firstMonth"),
  item("winterClothes", "moving", "household", "firstMonth", "perPerson"),
  item("householdBasics", "moving", "household", "firstMonth"),
  item("utilityDeposits", "moving", "connectivity", "firstMonth"),
  item("phoneLine", "moving", "connectivity", "firstMonth", "perAdult"),
  item("licenseTests", "moving", "car", "firstMonth", "perAdult"),
  item("carPurchase", "moving", "car", "firstMonth"),
  item("carInsuranceStart", "moving", "car", "firstMonth"),
  item("carRegistration", "moving", "car", "firstMonth"),
  item("healthInsuranceStart", "moving", "healthFamily", "firstMonth", "total", true),
  item("childcareStart", "moving", "healthFamily", "firstMonth"),
  item("otherMoving", "moving", "otherMoving", "firstMonth"),

  /* Monthly running costs */
  item("rent", "monthly", "monthlyCosts", "monthly"),
  item("utilities", "monthly", "monthlyCosts", "monthly"),
  item("internet", "monthly", "monthlyCosts", "monthly"),
  item("phone", "monthly", "monthlyCosts", "monthly"),
  item("food", "monthly", "monthlyCosts", "monthly"),
  item("transport", "monthly", "monthlyCosts", "monthly"),
  item("healthInsurance", "monthly", "monthlyCosts", "monthly", "total", true),
  item("carInsurance", "monthly", "monthlyCosts", "monthly"),
  item("childcare", "monthly", "monthlyCosts", "monthly"),
  item("otherMonthly", "monthly", "monthlyCosts", "monthly"),
];

/**
 * Quick mode: five big boxes, one per stage. Each amount is the whole household's
 * total for that stage (a quick estimate typed by the user).
 */
export const QUICK_ITEMS: readonly ItemDef[] = [
  { id: "quickBeforeInterview", calculator: "fees", group: "paperwork", stage: "beforeInterview", scaling: "total" },
  { id: "quickAtInterview", calculator: "fees", group: "paperwork", stage: "atInterview", scaling: "total" },
  { id: "quickBeforeTravel", calculator: "fees", group: "travel", stage: "beforeTravel", scaling: "total" },
  { id: "quickFirstMonth", calculator: "moving", group: "housingStart", stage: "firstMonth", scaling: "total" },
  { id: "quickMonthly", calculator: "monthly", group: "monthlyCosts", stage: "monthly", scaling: "total" },
];

export function itemsOfCalculator(calculator: Calculator): ItemDef[] {
  return ITEMS.filter((i) => i.calculator === calculator);
}

export function findItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id) ?? QUICK_ITEMS.find((i) => i.id === id);
}

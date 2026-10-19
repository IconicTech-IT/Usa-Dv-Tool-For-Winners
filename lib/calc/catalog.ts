/**
 * The list of cost items, as in the approved design (v10). Only ids, stage, grouping and
 * how an amount scales with the household. There are NO amounts here: the user types
 * every number. Labels and guide links live in the messages and the guide pages.
 *
 * Two different groupings, kept apart on purpose:
 * - `stage` is WHEN the money is due. The money timeline follows it.
 * - `group` is WHERE the item sits on the screen of its calculator.
 */

export type Stage =
  "beforeEntry" | "beforeInterview" | "atInterview" | "beforeTravel" | "firstMonth" | "monthly";

/** Order matters: the cumulative timeline follows it. */
export const STAGES: readonly Stage[] = [
  "beforeEntry",
  "beforeInterview",
  "atInterview",
  "beforeTravel",
  "firstMonth",
  "monthly",
] as const;

/**
 * How the typed amount scales with the household.
 * - perEntrant: everyone who is written on the entry: the applicant, the spouse (if any) and all children.
 * - applicantOnly: the main applicant alone.
 * - perFamilyMember: the spouse (if any) and all children, without the applicant.
 * - perRegistration: the number of entries made (one, or two when the spouse also enters).
 */
export type Scaling =
  | "total"
  | "perPerson"
  | "perAdult"
  | "perChild"
  | "perEntrant"
  | "applicantOnly"
  | "perFamilyMember"
  | "perRegistration";

/** What the multiplier of a scaled item counts, for the line under its box ("× 3 people"). */
export type CountUnit = "people" | "adults" | "children" | "entries";

const COUNT_UNITS: Partial<Record<Scaling, CountUnit>> = {
  perPerson: "people",
  perEntrant: "people",
  perFamilyMember: "people",
  perAdult: "adults",
  perChild: "children",
  perRegistration: "entries",
};

/** The unit an item's multiplier counts; null when the amount is not multiplied (whole household, applicant only). */
export function countUnitOf(scaling: Scaling): CountUnit | null {
  return COUNT_UNITS[scaling] ?? null;
}

/** Which calculator an item belongs to. */
export type Calculator = "fees" | "moving" | "monthly";

export type GroupId =
  // Fees calculator
  | "passport"
  | "entry"
  | "documents"
  | "interview"
  | "afterVisa"
  // Moving calculator
  | "travel"
  | "housing"
  | "household"
  | "connectivity"
  | "car"
  | "healthFamily"
  // Monthly costs (the runway)
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
  /* Fees: the passport, needed before anything else */
  fees("passport", "passport", "beforeEntry", { scaling: "applicantOnly" }),

  /* Fees: entering the lottery */
  fees("registrationFee", "entry", "beforeEntry", { scaling: "perRegistration" }),
  fees("entryPhotos", "entry", "beforeEntry", { scaling: "perEntrant" }),
  fees("entryHelp", "entry", "beforeEntry"),

  /* Fees: documents */
  fees("familyPassports", "documents", "beforeInterview", { scaling: "perFamilyMember" }),
  fees("medicalExam", "documents", "beforeInterview", { scaling: "perPerson" }),
  fees("policeCertificate", "documents", "beforeInterview", { scaling: "perPerson" }),
  fees("translation", "documents", "beforeInterview"),
  fees("civilCertificates", "documents", "beforeInterview"),
  fees("militaryCertificate", "documents", "beforeInterview"),
  fees("visaPhotos", "documents", "beforeInterview", { scaling: "perPerson" }),

  /* Fees: the interview */
  fees("visaFee", "interview", "atInterview", { scaling: "perPerson" }),
  fees("interviewTravel", "interview", "atInterview"),
  fees("passportCourier", "interview", "beforeTravel", { scaling: "perPerson" }),

  /* Fees: after the visa */
  fees("immigrantFee", "afterVisa", "beforeTravel", { scaling: "perPerson" }),
  fees("otherPaperwork", "afterVisa", "beforeTravel"),

  /* Moving: travel */
  moving("ticket", "travel", "beforeTravel", { scaling: "perPerson" }),
  moving("excessBaggage", "travel", "beforeTravel"),
  moving("travelInsurance", "travel", "beforeTravel", { toggle: true }),

  /* Moving: housing, household, connectivity (the first month there) */
  moving("temporaryStay", "housing", "firstMonth"),
  moving("applicationFees", "housing", "firstMonth"),
  moving("securityDeposit", "housing", "firstMonth"),
  moving("firstMonthRent", "housing", "firstMonth"),
  moving("furniture", "household", "firstMonth"),
  moving("winterClothes", "household", "firstMonth", { scaling: "perPerson" }),
  moving("householdBasics", "household", "firstMonth"),
  moving("utilityDeposits", "connectivity", "firstMonth"),
  moving("phoneLine", "connectivity", "firstMonth", { scaling: "perAdult" }),

  /* Moving: car */
  moving("licenseTests", "car", "firstMonth", { scaling: "perPerson" }),
  moving("carPurchase", "car", "firstMonth"),
  moving("carInsuranceStart", "car", "firstMonth"),
  moving("carRegistration", "car", "firstMonth"),

  /* Moving: health and family */
  moving("healthInsuranceStart", "healthFamily", "firstMonth", { toggle: true }),
  moving("childcareStart", "healthFamily", "firstMonth", { scaling: "perChild" }),
  moving("otherMoving", "healthFamily", "firstMonth"),

  /* Monthly running costs */
  monthly("rent", "monthlyCosts", "monthly"),
  monthly("utilities", "monthlyCosts", "monthly"),
  monthly("internet", "monthlyCosts", "monthly"),
  monthly("phone", "monthlyCosts", "monthly"),
  monthly("food", "monthlyCosts", "monthly", { scaling: "perPerson" }),
  monthly("transport", "monthlyCosts", "monthly"),
  monthly("healthInsurance", "monthlyCosts", "monthly", { toggle: true }),
  monthly("carInsurance", "monthlyCosts", "monthly"),
  monthly("childcare", "monthlyCosts", "monthly", { scaling: "perChild" }),
  monthly("otherMonthly", "monthlyCosts", "monthly"),
];

/**
 * Quick mode: five big boxes (all paperwork and fees, travel, first housing and set-up,
 * car and insurance, one month of costs). Each amount is the whole household's total for
 * that box. Savings is the separate field every plan has.
 */
export const QUICK_ITEMS: readonly ItemDef[] = [
  {
    id: "quickPaperwork",
    calculator: "fees",
    group: "documents",
    stage: "beforeInterview",
    scaling: "total",
  },
  { id: "quickTravel", calculator: "moving", group: "travel", stage: "beforeTravel", scaling: "total" },
  { id: "quickHousing", calculator: "moving", group: "housing", stage: "firstMonth", scaling: "total" },
  { id: "quickCar", calculator: "moving", group: "car", stage: "firstMonth", scaling: "total" },
  { id: "quickMonthly", calculator: "monthly", group: "monthlyCosts", stage: "monthly", scaling: "total" },
];

export function itemsOfCalculator(calculator: Calculator): ItemDef[] {
  return ITEMS.filter((i) => i.calculator === calculator);
}

export function findItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id) ?? QUICK_ITEMS.find((i) => i.id === id);
}

export interface GroupDef {
  id: GroupId;
  /** When the money of the group's first item is due; the screen shows it next to the group title. */
  stage: Stage;
  items: ItemDef[];
}

/** The groups of one calculator, in the order of the catalog. */
export function groupsOfCalculator(calculator: Calculator): GroupDef[] {
  const groups: GroupDef[] = [];
  for (const item of itemsOfCalculator(calculator)) {
    const existing = groups.find((g) => g.id === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ id: item.group, stage: item.stage, items: [item] });
  }
  return groups;
}

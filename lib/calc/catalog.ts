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
 * The stages of the money timeline. The first six are the stages an item is due in; the next two exist
 * only when the family follows the principal later: the months he spends alone, and the family's arrival.
 * In that case the timeline shows "monthly" last, as the full family's cost of one month.
 */
export type TimelineStage = Stage | "aloneMonths" | "familyArrival";

export const TIMELINE_STAGES: readonly TimelineStage[] = [
  "beforeEntry",
  "beforeInterview",
  "atInterview",
  "beforeTravel",
  "firstMonth",
  "aloneMonths",
  "familyArrival",
  "monthly",
] as const;

/**
 * How the typed amount scales with the household.
 * - perEntrant: everyone who is written on the entry: the applicant, the spouse (if any) and all children.
 * - applicantOnly: the main applicant alone.
 * - perFamilyMember: the spouse (if any) and all children, without the applicant.
 * - perRegistration: the number of entries made (one, or two when the spouse also enters).
 * - The age groups (see ages.ts): the adults plus the children from 16 (police certificate) or from 15
 *   (full medical exam); the children under 15; the children under school age; the adult, child and infant
 *   fares of a flight. The adults always count with the older group.
 */
export type Scaling =
  | "total"
  | "perPerson"
  | "perAdult"
  | "perEntrant"
  | "applicantOnly"
  | "perFamilyMember"
  | "perRegistration"
  | "perAge16Plus"
  | "perAge15Plus"
  | "perUnder15"
  | "perUnderSchool"
  | "perAdultFare"
  | "perChildFare"
  | "perInfantFare";

/** Items of these scalings count nobody but the family, so the principal alone never counts in them. */
export const FAMILY_ONLY_SCALINGS: readonly Scaling[] = [
  "perFamilyMember",
  "perUnder15",
  "perUnderSchool",
  "perChildFare",
  "perInfantFare",
];

/** What the multiplier of a scaled item counts, for the line under its box ("× 3 people"). */
export type CountUnit = "people" | "adults" | "children" | "infants" | "entries";

const COUNT_UNITS: Partial<Record<Scaling, CountUnit>> = {
  perPerson: "people",
  perEntrant: "people",
  perFamilyMember: "people",
  perAdult: "adults",
  perRegistration: "entries",
  perAge16Plus: "people",
  perAge15Plus: "people",
  perAdultFare: "people",
  perUnder15: "children",
  perUnderSchool: "children",
  perChildFare: "children",
  perInfantFare: "infants",
};

/** The unit an item's multiplier counts; null when the amount is not multiplied (whole household, applicant only). */
export function countUnitOf(scaling: Scaling): CountUnit | null {
  return COUNT_UNITS[scaling] ?? null;
}

/** Which calculator an item belongs to. */
export type Calculator = "fees" | "moving" | "monthly";

/**
 * When the family follows the principal later, where an item's money falls:
 * - together: unchanged. The paperwork is the same for everyone (all get visas together).
 * - alone: all of it when the principal arrives.
 * - family: all of it when the family arrives.
 * - split: the principal's share at his stage, the family's share (per person) when the family arrives.
 * - whileApart: only in the months before the family arrives (the family's costs back home).
 */
export type FollowRule = "together" | "alone" | "family" | "split" | "whileApart";

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
  | "monthlyCosts"
  // The moving calculator when the family follows later: two cards instead of the five groups
  | "arrivalAlone"
  | "arrivalFamily";

export interface ItemDef {
  id: string;
  calculator: Calculator;
  group: GroupId;
  stage: Stage;
  scaling: Scaling;
  /** The user may switch this item between "whole household" and "per person" (default: whole household). */
  toggle?: boolean;
  /** Where the money falls when the family follows later (default: see `followRuleOf`). */
  follow?: FollowRule;
}

interface ItemOptions {
  scaling?: Scaling;
  toggle?: boolean;
  follow?: FollowRule;
}

function define(
  calculator: Calculator,
  id: string,
  where: { group: GroupId; stage: Stage },
  options: ItemOptions,
): ItemDef {
  const { scaling = "total", toggle = false, follow } = options;
  const base = { id, calculator, group: where.group, stage: where.stage, scaling };
  const withToggle = toggle ? { ...base, toggle } : base;
  return follow === undefined ? withToggle : { ...withToggle, follow };
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
  fees("medicalExam", "documents", "beforeInterview", { scaling: "perAge15Plus" }),
  fees("medicalExamChild", "documents", "beforeInterview", { scaling: "perUnder15" }),
  fees("policeCertificate", "documents", "beforeInterview", { scaling: "perAge16Plus" }),
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
  moving("ticket", "travel", "beforeTravel", { scaling: "perAdultFare", follow: "split" }),
  moving("ticketChild", "travel", "beforeTravel", { scaling: "perChildFare", follow: "split" }),
  moving("ticketInfant", "travel", "beforeTravel", { scaling: "perInfantFare", follow: "split" }),
  moving("excessBaggage", "travel", "beforeTravel"),
  moving("travelInsurance", "travel", "beforeTravel", { toggle: true, follow: "split" }),

  /* Moving: housing, household, connectivity (the first month there) */
  moving("temporaryStay", "housing", "firstMonth"),
  moving("applicationFees", "housing", "firstMonth", { follow: "family" }),
  moving("securityDeposit", "housing", "firstMonth", { follow: "family" }),
  moving("firstMonthRent", "housing", "firstMonth", { follow: "family" }),
  moving("furniture", "household", "firstMonth", { follow: "family" }),
  moving("winterClothes", "household", "firstMonth", { scaling: "perPerson", follow: "split" }),
  moving("householdBasics", "household", "firstMonth"),
  moving("utilityDeposits", "connectivity", "firstMonth", { follow: "family" }),
  moving("phoneLine", "connectivity", "firstMonth", { scaling: "perAdult", follow: "split" }),

  /* Moving: car */
  moving("licenseTests", "car", "firstMonth", { scaling: "perAdult", follow: "split" }),
  moving("carPurchase", "car", "firstMonth"),
  moving("carInsuranceStart", "car", "firstMonth"),
  moving("carRegistration", "car", "firstMonth"),

  /* Moving: health and family */
  moving("healthInsuranceStart", "healthFamily", "firstMonth", { toggle: true, follow: "split" }),
  moving("childcareStart", "healthFamily", "firstMonth", { scaling: "perUnderSchool", follow: "split" }),
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
  monthly("childcare", "monthlyCosts", "monthly", { scaling: "perUnderSchool" }),
  monthly("otherMonthly", "monthlyCosts", "monthly"),
  // Only when the family follows later: what the family spends back home until it joins the principal.
  monthly("familyAbroadMonthly", "monthlyCosts", "monthly", { follow: "whileApart" }),
];

/** Where an item's money falls when the family follows later. */
export function followRuleOf(def: ItemDef): FollowRule {
  if (def.follow !== undefined) return def.follow;
  return def.stage === "firstMonth" ? "alone" : "together";
}

/**
 * The monthly boxes the principal types for the months he spends alone, when the family follows later:
 * the same boxes as the family's monthly costs, each typed for one person. There is no box for children
 * (none are with him), and the family's costs back home are their own item.
 */
export const ALONE_MONTHLY_ITEMS: readonly ItemDef[] = ITEMS.filter(
  (item) =>
    item.calculator === "monthly" &&
    !FAMILY_ONLY_SCALINGS.includes(item.scaling) &&
    followRuleOf(item) !== "whileApart",
);

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
  stage: TimelineStage;
  items: ItemDef[];
}

/** The groups of one calculator, in the order of the catalog. */
function catalogGroups(calculator: Calculator): GroupDef[] {
  const groups: GroupDef[] = [];
  for (const item of itemsOfCalculator(calculator)) {
    const existing = groups.find((g) => g.id === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ id: item.group, stage: item.stage, items: [item] });
  }
  return groups;
}

function isFamilyArrivalItem(def: ItemDef): boolean {
  const rule = followRuleOf(def);
  return rule === "family" || (rule === "split" && FAMILY_ONLY_SCALINGS.includes(def.scaling));
}

/**
 * The groups of one calculator. When the family follows later, the moving calculator keeps the travel
 * group and replaces the five groups of the first month by two cards: the principal's arrival and the
 * family's arrival. An item that splits between them sits on the first card, with its family share
 * counted automatically.
 */
export function groupsOfCalculator(calculator: Calculator, followsLater = false): GroupDef[] {
  const groups = catalogGroups(calculator);
  if (!followsLater || calculator !== "moving") return groups;

  const arrival = groups.filter((g) => g.stage === "firstMonth").flatMap((g) => g.items);
  return [
    ...groups.filter((g) => g.stage !== "firstMonth"),
    { id: "arrivalAlone", stage: "firstMonth", items: arrival.filter((i) => !isFamilyArrivalItem(i)) },
    { id: "arrivalFamily", stage: "familyArrival", items: arrival.filter(isFamilyArrivalItem) },
  ];
}

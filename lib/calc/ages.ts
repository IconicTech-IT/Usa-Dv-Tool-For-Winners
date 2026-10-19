import { parseAmount } from "@/lib/calc/parse-amount";

/**
 * Who a per-person cost counts depends on a child's age. These are the ages where the rules change.
 * The sources are in the notes of each item; the school age is our own analysis, not a rule.
 */

/** The oldest a child can be to be on the entry: unmarried and under 21. */
export const MAX_CHILD_AGE = 20;
/** A baby under this age flies as an infant on most airlines (a general pattern, unconfirmed). */
export const AGE_INFANT_UNDER = 2;
/** A child up to this age flies on a child fare on most airlines; from the next age it is an adult fare (unconfirmed). */
export const AGE_CHILD_FARE_UNTIL = 11;
/** X-rays and blood tests are not required under this age and are for everyone from it (Cairo supplement). */
export const AGE_X_RAY_FROM = 15;
/** The police certificate is for applicants from this age (Cairo supplement). */
export const AGE_POLICE_CERTIFICATE_FROM = 16;
/** Childcare is counted for children under this age: the age of kindergarten in the US (our analysis). */
export const AGE_SCHOOL_FROM = 5;

/** A child's age in whole years from what was typed (Arabic digits too); null when empty or not 0 to 20. */
export function parseAge(raw: string): number | null {
  const parsed = parseAmount(raw);
  if (!parsed.ok || parsed.amount.scale !== 0) return null;
  const age = Number(parsed.amount.units);
  return age >= 0 && age <= MAX_CHILD_AGE ? age : null;
}

/**
 * How many children fall in each group that a cost counts. A child with no age yet is counted as a small
 * child: a child fare, under 15 for the medical exam, of childcare age, and not yet 16.
 */
export interface AgeGroups {
  /** Children whose age is not typed (or not a whole number from 0 to 20). */
  unknown: number;
  /** Younger than two: the infant fare. */
  infants: number;
  /** From two to eleven (and any child with no age yet): the child fare. */
  childFare: number;
  /** Twelve or older: the adult fare. */
  adultFare: number;
  /** Younger than fifteen (and any child with no age yet): no X-ray or blood test. */
  under15: number;
  /** Fifteen or older: the full medical exam. */
  from15: number;
  /** Sixteen or older: needs a police certificate. */
  from16: number;
  /** Younger than school age (and any child with no age yet): childcare. */
  underSchool: number;
}

export function ageGroups(childAges: readonly string[], children: number): AgeGroups {
  const groups: AgeGroups = {
    unknown: 0,
    infants: 0,
    childFare: 0,
    adultFare: 0,
    under15: 0,
    from15: 0,
    from16: 0,
    underSchool: 0,
  };
  for (let index = 0; index < children; index += 1) {
    const age = parseAge(childAges[index] ?? "");
    if (age === null) {
      groups.unknown += 1;
      groups.childFare += 1;
      groups.under15 += 1;
      groups.underSchool += 1;
      continue;
    }
    if (age < AGE_INFANT_UNDER) groups.infants += 1;
    else if (age <= AGE_CHILD_FARE_UNTIL) groups.childFare += 1;
    else groups.adultFare += 1;
    if (age < AGE_X_RAY_FROM) groups.under15 += 1;
    else groups.from15 += 1;
    if (age >= AGE_POLICE_CERTIFICATE_FROM) groups.from16 += 1;
    if (age < AGE_SCHOOL_FROM) groups.underSchool += 1;
  }
  return groups;
}

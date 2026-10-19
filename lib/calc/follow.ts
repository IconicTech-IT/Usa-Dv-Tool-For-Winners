import { pow10, type Decimal } from "@/lib/calc/decimal";
import { multiplyCents, type Cents } from "@/lib/calc/money";

/**
 * The money maths of a family that arrives some months after the principal. For the first `months`
 * months only the principal is there (plus what the family spends back home); from the month after,
 * the whole family is.
 */

export interface FollowPhases {
  /** Months until the family arrives. */
  months: number;
  /** One month of costs while the principal is alone (the family's costs back home included). */
  aloneMonthlyCents: Cents;
  /** One month of costs for the whole family, from the month after it arrives. */
  fullMonthlyCents: Cents;
}

/**
 * The monthly costs of a number of months counted from the principal's arrival, which may be fractional
 * (a typed buffer such as 1.5 months). A whole month is priced at the phase it falls in; the fraction at
 * the phase of the month it starts. No loop: the months after the family arrives all cost the same.
 */
export function costOfMonths(months: Decimal, phases: FollowPhases): Cents {
  const divisor = pow10(months.scale);
  const whole = months.units / divisor;
  const fraction = months.units % divisor;
  const apart = BigInt(phases.months);

  const wholeAlone = whole < apart ? whole : apart;
  const wholeTogether = whole > apart ? whole - apart : 0n;
  const wholeCost = phases.aloneMonthlyCents * wholeAlone + phases.fullMonthlyCents * wholeTogether;
  if (fraction === 0n) return wholeCost;

  const next = whole < apart ? phases.aloneMonthlyCents : phases.fullMonthlyCents;
  return wholeCost + multiplyCents(next, { units: fraction, scale: months.scale });
}

/** A whole number of months added to a typed number of months. */
export function addMonths(months: Decimal, whole: number): Decimal {
  return { units: months.units + BigInt(whole) * pow10(months.scale), scale: months.scale };
}

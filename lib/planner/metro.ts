import type { Field, Localized } from "@/lib/types";
import type { Metro } from "@/content/_schema";
import { z } from "zod";

/**
 * الشكل المختصر اللي بيتبعت للمحرك على المتصفح.
 * كل حقل بيحتفظ بحالته — عشان المحرك يعرف إيه المؤكد وإيه اللي ناقص،
 * والواجهة تعرض البادج الصح.
 */
export interface PlannerMetro {
  slug: string;
  name: Localized;
  state: string;
  carNeed: Field<number>;
  carNeedLabel: Localized;
  transitScore: Field<number>;
  monthlyTransitPass: Field<number>;
  roomRent: Field<number>;
  apt1br: Field<number>;
  apt2br: Field<number>;
  securityDeposit: Field<number>;
  utilities: Field<number>;
  groceriesPerAdult: Field<number>;
  carInsurance: Field<number>;
  gigDemand: Field<number>;
  worksWithoutEnglish: Field<number>;
  arabCommunity: Field<number>;
  schoolQuality: Field<number>;
  winterSeverity: Field<number>;
}

type MetroT = z.infer<typeof Metro>;

export function toPlannerMetro(m: MetroT): PlannerMetro {
  return {
    slug: m.slug,
    name: m.name,
    state: m.state,
    carNeed: m.car.carNeed as Field<number>,
    carNeedLabel: m.car.carNeedLabel,
    transitScore: m.car.transitScore as Field<number>,
    monthlyTransitPass: m.car.monthlyTransitPass as Field<number>,
    roomRent: m.costs.roomRent as Field<number>,
    apt1br: m.costs.apt1br as Field<number>,
    apt2br: m.costs.apt2br as Field<number>,
    securityDeposit: m.costs.securityDeposit as Field<number>,
    utilities: m.costs.utilities as Field<number>,
    groceriesPerAdult: m.costs.groceriesPerAdult as Field<number>,
    carInsurance: m.costs.carInsurance as Field<number>,
    gigDemand: m.work.gigDemand as Field<number>,
    worksWithoutEnglish: m.work.worksWithoutEnglish as Field<number>,
    arabCommunity: m.life.arabCommunity as Field<number>,
    schoolQuality: m.life.schoolQuality as Field<number>,
    winterSeverity: m.life.winterSeverity as Field<number>,
  };
}

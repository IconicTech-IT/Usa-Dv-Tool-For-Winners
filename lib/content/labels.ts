import type { Localized } from "@/lib/types";

/**
 * أسماء الحقول بلغة المستخدم.
 *
 * ⚠️ الواجهة كانت بتعرض مفتاح الحقل زي ما هو: `austin-tx.monthlyTransitPass`.
 * ده اسم برمجي — المستخدم بيقراه ومبيفهمش منه حاجة، فبيتحول لضوضاء بدل
 * ما يكون معلومة. وقايمة "الأرقام دي لسه محتاجة تأكيد" هي بالظبط المكان
 * اللي المفروض المستخدم يفهم منه إيه اللي ناقص عشان يقرر يعتمد على
 * الحسبة ولا لأ.
 *
 * أي حقل جديد ممكن يظهر كناقص لازم يتحط هنا. اللي مش موجود بيرجع بمفتاحه
 * زي ما هو — وحش بس صادق، أحسن من اسم مخترع غلط.
 */
export const FIELD_LABELS: Record<string, Localized> = {
  // السكن والمعيشة في المدينة
  roomRent: { ar: "إيجار أوضة في شقة مشتركة", en: "Room in a shared apartment" },
  apt1br: { ar: "إيجار شقة غرفة واحدة", en: "One-bedroom rent" },
  apt2br: { ar: "إيجار شقة غرفتين", en: "Two-bedroom rent" },
  housing: { ar: "الإيجار", en: "Rent" },
  securityDeposit: { ar: "تأمين السكن", en: "Security deposit" },
  utilities: { ar: "الفواتير", en: "Utilities" },
  groceriesPerAdult: { ar: "مصاريف الأكل للفرد", en: "Food per adult" },
  carInsurance: { ar: "تأمين العربية", en: "Car insurance" },
  monthlyTransitPass: { ar: "اشتراك المواصلات الشهري", en: "Monthly transit pass" },

  // الضرايب
  stateTax: { ar: "ضريبة دخل الولاية", en: "State income tax" },
  federalBrackets: { ar: "شرايح الضريبة الفيدرالية", en: "Federal tax brackets" },
  standardDeduction: { ar: "الخصم القياسي", en: "Standard deduction" },
  socialSecurityRate: { ar: "نسبة الضمان الاجتماعي", en: "Social Security rate" },
  socialSecurityWageCap: { ar: "سقف الضمان الاجتماعي", en: "Social Security wage cap" },
  medicareRate: { ar: "نسبة الميديكير", en: "Medicare rate" },
  childTaxCredit: { ar: "إعفاء الطفل", en: "Child tax credit" },
  selfEmploymentRate: { ar: "نسبة ضريبة العمل الحر", en: "Self-employment tax rate" },
  irsMileageRate: { ar: "خصم الميل الرسمي", en: "IRS mileage rate" },
  "federalPovertyLine.base": { ar: "خط الفقر الفيدرالي", en: "Federal poverty line" },
  "federalPovertyLine.perPerson": {
    ar: "خط الفقر — الزيادة لكل فرد",
    en: "Poverty line — per extra person",
  },

  // العربية
  fuelPrice: { ar: "سعر البنزين", en: "Fuel price" },
  maintenancePerMile: { ar: "الصيانة لكل ميل", en: "Maintenance per mile" },
  milesPerHour: { ar: "الأميال في الساعة", en: "Miles per hour" },
  registration: { ar: "رسوم ترخيص العربية", en: "Vehicle registration" },
};

/**
 * بيحوّل مفتاح زي `austin-tx.monthlyTransitPass` لجملة يفهمها المستخدم.
 *
 * `cities` اختياري: لو اتبعت، اسم المدينة بيتحط بدل الـslug. من غيره
 * بنشيل الـslug خالص — لأن الصفحة أصلًا بتقول المدينة فوق، والـslug
 * لوحده مبيضيفش معلومة.
 */
export function humanField(
  key: string,
  locale: "ar" | "en",
  cities?: Record<string, Localized>,
): string {
  const dot = key.indexOf(".");
  const maybeSlug = dot === -1 ? "" : key.slice(0, dot);
  const isMetro = maybeSlug !== "" && cities !== undefined && maybeSlug in cities;

  // `federalPovertyLine.base` فيه نقطة بس مش مدينة — بندوّر على المفتاح كامل الأول
  const label = FIELD_LABELS[key];
  if (label) return label[locale] || label.ar;

  const bare = dot === -1 ? key : key.slice(dot + 1);
  const bareLabel = FIELD_LABELS[bare];
  if (!bareLabel) return key;

  const text = bareLabel[locale] || bareLabel.ar;
  if (!isMetro) return text;

  const city = cities[maybeSlug];
  if (!city) return text;
  return `${text} — ${city[locale] || city.ar}`;
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { FieldValue, localized } from "@/components/FieldValue";
import { Money } from "@/components/Num";
import type { Field, Localized } from "@/lib/types";

/**
 * الرسوم الرسمية جنب خريطة الرحلة.
 *
 * ⚠️ الملف `content/fees.json` كان متملّي ومتأكد من الصفحات الرسمية —
 * ومحدش بيعرضه. `loadFees()` كان بيتنادى من سكريبت التحقق بس. رقم مؤكد
 * مخبّي في ملف قيمته صفر للمستخدم.
 *
 * `perPerson` مش زينة: رسم التسجيل بيتدفع من المتقدم الأساسي لوحده،
 * ورسم الفيزا بيتدفع عن كل فرد داخل. الفرق ده بيغيّر إجمالي عيلة من ٤
 * بمئات الدولارات، فلازم يبان في الجدول مش في فوتنوت.
 */
export interface FeeRow {
  id: string;
  name: Localized;
  who: Localized;
  when: Localized;
  perPerson: boolean;
  amount: Field<number>;
}

export function Fees({ fees }: { fees: FeeRow[] }) {
  const t = useTranslations("fees");
  const locale = useLocale() as "ar" | "en";

  const known = fees.filter((f) => typeof f.amount.value === "number");
  const perPersonTotal = known
    .filter((f) => f.perPerson)
    .reduce((sum, f) => sum + (f.amount.value as number), 0);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-[var(--slate)]">{t("lead")}</p>
      </div>

      <ul className="space-y-2">
        {fees.map((fee) => (
          <Card key={fee.id} as="li">
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{localized(fee.name, locale)}</h3>
                <FieldValue field={fee.amount} prefix="$" />
              </div>

              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-[var(--slate)]">{t("who")}</dt>
                  <dd>{localized(fee.who, locale)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-[var(--slate)]">{t("when")}</dt>
                  <dd>{localized(fee.when, locale)}</dd>
                </div>
              </dl>

              <p className="text-sm">
                <span className="badge badge--estimated">
                  {fee.perPerson ? t("perPerson") : t("oncePerFamily")}
                </span>
              </p>
            </div>
          </Card>
        ))}
      </ul>

      {perPersonTotal > 0 && (
        <Card status="now">
          <div className="space-y-1 p-4">
            <p className="font-bold">
              {t("perPersonTotal")} <Money value={perPersonTotal} />
            </p>
            <p className="text-sm text-[var(--slate)]">{t("totalNote")}</p>
          </div>
        </Card>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { FieldValue, localized } from "@/components/FieldValue";
import { CarNeedBar } from "@/components/ui";
import type { PlannerMetro } from "@/lib/planner/metro";

type SortKey = "carNeed" | "roomRent" | "apt1br" | "carInsurance" | "transitScore";

/**
 * أهم صفحة مقارنة في الموقع.
 *
 * ⚠️ أول فلتر فيها هو "ينفع أعيش من غير عربية؟" — لأن ده أكبر بند
 * في ميزانية السنة الأولى، وأكتر حاجة الناس بتعمّمها غلط من الولاية
 * على المدينة.
 */
export function CompareCities({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("compareCities");
  const tb = useTranslations("badges");
  const locale = useLocale() as "ar" | "en";

  const [maxCarNeed, setMaxCarNeed] = useState(5);
  const [sort, setSort] = useState<SortKey>("carNeed");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const filtered = metros.filter((m) => (m.carNeed.value ?? 5) <= maxCarNeed);
    return [...filtered].sort((a, b) => {
      const av = a[sort]?.value;
      const bv = b[sort]?.value;
      // الحقول الناقصة بتنزل تحت — مبتتحسبش كصفر
      if (typeof av !== "number") return 1;
      if (typeof bv !== "number") return -1;
      return av - bv;
    });
  }, [metros, maxCarNeed, sort]);

  const compared = metros.filter((m) => picked.includes(m.slug));

  const toggle = (slug: string) =>
    setPicked((p) =>
      p.includes(slug) ? p.filter((s) => s !== slug) : p.length < 3 ? [...p, slug] : p,
    );

  return (
    <div className="space-y-6">
      <Card status="now">
        <div className="p-4 space-y-3">
          <label className="block space-y-2">
            <span className="font-bold">{t("carFilter")}</span>
            <input
              type="range"
              min={1}
              max={5}
              value={maxCarNeed}
              onChange={(e) => setMaxCarNeed(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-[var(--slate)]">
              {t(`carLevel.${maxCarNeed}`)}
            </span>
          </label>

          <label className="flex flex-wrap items-center gap-2 text-sm">
            {t("sortBy")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-sm border border-[var(--glass-border)] bg-transparent px-2 py-1"
            >
              {(["carNeed", "roomRent", "apt1br", "carInsurance", "transitScore"] as SortKey[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {t(`columns.${k}`)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </Card>

      {compared.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <caption className="text-start pb-2 font-bold">{t("sideBySide")}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-start p-2">{t("columns.city")}</th>
                {compared.map((m) => (
                  <th key={m.slug} scope="col" className="text-start p-2">
                    {localized(m.name, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["roomRent", "apt1br", "carInsurance", "monthlyTransitPass"] as const).map((key) => (
                <tr key={key} className="border-t border-[var(--glass-border)]">
                  <th scope="row" className="text-start p-2 font-normal text-[var(--slate)]">
                    {t(`columns.${key}`)}
                  </th>
                  {compared.map((m) => (
                    <td key={m.slug} className="p-2">
                      <FieldValue field={m[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((m) => (
            <Card key={m.slug} as="li">
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold">{localized(m.name, locale)}</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={picked.includes(m.slug)}
                      onChange={() => toggle(m.slug)}
                    />
                    {t("compare")}
                  </label>
                </div>

                <CarNeedBar
                  level={typeof m.carNeed.value === "number" ? m.carNeed.value : null}
                  label={localized(m.carNeedLabel, locale)}
                  unknownLabel={tb("needsVerification")}
                />

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {(["roomRent", "apt1br", "carInsurance", "monthlyTransitPass"] as const).map(
                    (key) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--slate)]">{t(`columns.${key}`)}</dt>
                        <dd>
                          <FieldValue field={m[key]} />
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </div>
            </Card>
        ))}
      </ul>
    </div>
  );
}

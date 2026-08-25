"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Link } from "@/i18n/navigation";
import { FieldValue, localized } from "@/components/FieldValue";
import type { Field, Localized } from "@/lib/types";

export interface JobRow {
  slug: string;
  name: string;
  category: string;
  summary: Localized;
  needsCar: Field<boolean>;
  needsEnglish: Field<number>;
  activationDays: Field<number>;
}

/**
 * الفلترين المهمين: "من غير عربية" و"من غير إنجليزي".
 * دول السؤالين اللي بيحددوا إيه المتاح فعلًا لواحد لسه واصل.
 */
export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  const t = useTranslations("jobs");
  const locale = useLocale() as "ar" | "en";
  const [noCar, setNoCar] = useState(false);
  const [noEnglish, setNoEnglish] = useState(false);

  const visible = jobs.filter((j) => {
    // ⚠️ حقل ناقص مبيتفلترش برة — مبنعرفش، فبنسيبه ظاهر وعليه بادج
    if (noCar && j.needsCar.value === true) return false;
    if (noEnglish && typeof j.needsEnglish.value === "number" && j.needsEnglish.value > 2)
      return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <Card status="now">
        <div className="p-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noCar} onChange={(e) => setNoCar(e.target.checked)} />
            {t("filterNoCar")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noEnglish}
              onChange={(e) => setNoEnglish(e.target.checked)}
            />
            {t("filterNoEnglish")}
          </label>
        </div>
      </Card>

      <ul className="space-y-3">
        {visible.map((j) => (
          <Card key={j.slug} as="li">
            <div className="p-4 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold">
                  <Link href={`/jobs/${j.slug}`} className="underline underline-offset-4">
                    {j.name}
                  </Link>
                </h2>
                <span className="text-sm text-[var(--slate)]">
                  {t(`categories.${j.category}`)}
                </span>
              </div>
              <p className="text-sm">{localized(j.summary, locale)}</p>
              <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm pt-1">
                <div className="flex items-center gap-2">
                  <dt className="text-[var(--slate)]">{t("needsCar")}</dt>
                  <dd><FieldValue field={j.needsCar} /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-[var(--slate)]">{t("needsEnglish")}</dt>
                  <dd><FieldValue field={j.needsEnglish} /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-[var(--slate)]">{t("activation")}</dt>
                  <dd><FieldValue field={j.activationDays} /></dd>
                </div>
              </dl>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}

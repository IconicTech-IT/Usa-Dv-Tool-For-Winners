"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { takeHome, healthSubsidy, type FilingStatus, type TaxTables, type Bracket } from "@/lib/calculators/tax";
import {
  BigResult,
  CalcField,
  MissingNote,
  NumInput,
  SendIncomeToPlan,
  StaleTaxYear,
} from "./shared";

export interface StateOption {
  code: string;
  name: { ar: string; en: string };
  flatRate: number | null;
  brackets: Bracket[] | null;
  /** `false` = الولاية مفيهاش ضريبة دخل أصلًا. `null` = مش عارفين. */
  hasIncomeTax: boolean | null;
}

export interface MetroOption {
  slug: string;
  name: { ar: string; en: string };
  state: string;
  localTaxRate: number | null;
}

/**
 * "معروض عليّ مرتب $X — هيوصلني منه كام في إيدي؟"
 *
 * ⚠️ الحاسبة دي أداة **جانبية**، مش نقطة البداية. جمهور الموقع بينزل
 * من غير شغل، فالسؤال الأول في الموقع هو "معاك كام؟" مش "مرتبك كام؟".
 */
export function TakeHome({
  tables,
  states,
  metros,
}: {
  tables: TaxTables;
  states: StateOption[];
  metros: MetroOption[];
}) {
  const t = useTranslations("takeHome");
  const locale = useLocale() as "ar" | "en";

  const [salary, setSalary] = useState(55_000);
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [dependents, setDependents] = useState(0);
  const [stateCode, setStateCode] = useState(states[0]?.code ?? "");
  const [metroSlug, setMetroSlug] = useState("");

  const state = states.find((s) => s.code === stateCode);
  /**
   * ⚠️ الفرق بين "صفر" و"مش عارفين" — ودا فرق بيغيّر رقم في إيد المستخدم.
   *
   * ولاية مفيهاش ضريبة دخل بتدي **صفر**، مش `null`. لما كانت بتدي `null`
   * الحاسبة كانت بتعلّم صافي مرتب تكساس بـ"محتاج تأكيد" وتحط علامة
   * استفهام مكان الرقم — واللي بيقارن عرض شغل في تكساس بعرض في
   * كاليفورنيا كان بيلاقي نص المقارنة فاضي.
   */
  const noStateTax = state?.hasIncomeTax === false;
  const stateTaxInput = state?.brackets ?? state?.flatRate ?? (noStateTax ? 0 : null);
  const metro = metros.find((m) => m.slug === metroSlug);
  const cityOptions = metros.filter((m) => m.state === stateCode);

  const result = useMemo(
    () =>
      takeHome(
        {
          annualSalary: salary,
          filingStatus: filing,
          dependents,
          stateTax: stateTaxInput,
          localTaxRate: metro?.localTaxRate ?? null,
          householdSize: 1 + dependents,
        },
        tables,
      ),
    [salary, filing, dependents, stateTaxInput, metro, tables],
  );

  const subsidy = useMemo(
    () => healthSubsidy(salary, 1 + dependents, tables),
    [salary, dependents, tables],
  );

  return (
    <div className="space-y-6">
      <StaleTaxYear year={result.staleTaxYear} />

      <Card status="now">
        <div className="p-5 space-y-4">
          <CalcField label={t("salary")}>
            <NumInput value={salary} onChange={setSalary} prefix="$" />
          </CalcField>

          <CalcField label={t("filing")}>
            <select
              value={filing}
              onChange={(e) => setFiling(e.target.value as FilingStatus)}
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
            >
              {(["single", "married", "headOfHousehold"] as FilingStatus[]).map((f) => (
                <option key={f} value={f}>
                  {t(`filingOptions.${f}`)}
                </option>
              ))}
            </select>
          </CalcField>

          <CalcField label={t("dependents")}>
            <NumInput value={dependents} onChange={setDependents} />
          </CalcField>

          <CalcField label={t("state")}>
            <select
              value={stateCode}
              onChange={(e) => {
                setStateCode(e.target.value);
                setMetroSlug("");
              }}
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
            >
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {localized(s.name, locale)}
                </option>
              ))}
            </select>
          </CalcField>

          {/**
           * ⚠️ الصفر لازم يقول عن نفسه إنه صفر مقصود.
           * من غير السطر ده، بند "ضريبة الولاية · $0" بيتقرا كإننا
           * نسينا نحسبها.
           */}
          {noStateTax && (
            <p className="text-sm text-[var(--seal)]">{t("noStateTax")}</p>
          )}

          <CalcField label={t("city")}>
            <select
              value={metroSlug}
              onChange={(e) => setMetroSlug(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
            >
              <option value="">{t("noCity")}</option>
              {cityOptions.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {localized(m.name, locale)}
                </option>
              ))}
            </select>
          </CalcField>
        </div>
      </Card>

      <BigResult
        label={t("inYourHand")}
        value={`$${Math.round(result.netMonthly).toLocaleString("en-US")}`}
        hint={t("perMonth")}
        missing={result.missingFields.length > 0}
      />

      <Section title={t("breakdown")}>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-4 px-1 py-1.5 border-b border-[var(--glass-border)]">
            <span>{t("gross")}</span>
            <Money value={Math.round(result.gross)} />
          </li>
          {result.lines.map((l) => (
            <li
              key={l.key}
              className="flex items-center justify-between gap-4 px-1 py-1.5 border-b border-[var(--glass-border)]"
            >
              <span>{localized(l.label, locale)}</span>
              {l.missing ? (
                <span className="badge badge--needs-verification">?</span>
              ) : (
                <span>
                  −<Money value={Math.round(l.amount)} />
                </span>
              )}
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 px-1 py-2 font-bold">
            <span>{t("net")}</span>
            <Money value={Math.round(result.netAnnual)} />
          </li>
        </ul>

        {result.effectiveRate !== null && (
          <p className="text-sm text-[var(--slate)]">
            {t("effectiveRate", { rate: (result.effectiveRate * 100).toFixed(1) })}
          </p>
        )}
      </Section>

      {subsidy.percentOfPovertyLine !== null && (
        <Card>
          <div className="p-4 text-sm space-y-1">
            <p className="font-bold">{t("healthTitle")}</p>
            <p>
              {t("povertyLine", {
                pct: Math.round(subsidy.percentOfPovertyLine * 100),
              })}
            </p>
            <p className="text-[var(--slate)]">{t("healthHint")}</p>
          </div>
        </Card>
      )}

      {/**
       * ⚠️ صافي المرتب ده هو دخله الشهري في الخطة.
       * الرسم البياني بيرسم بافتراضنا لحد ما ياخد رقم حقيقي — ولو
       * معروض عليه شغل فعلًا، الرقم ده أصدق حاجة ممكن تدخل الخطة.
       * وبنبعته بس لما الحسبة تبقى كاملة، عشان مانحطش في خطته رقم
       * ناقصه ضريبة.
       */}
      {result.missingFields.length === 0 && (
        <SendIncomeToPlan monthly={result.netMonthly} />
      )}

      <MissingNote fields={result.missingFields} />
    </div>
  );
}

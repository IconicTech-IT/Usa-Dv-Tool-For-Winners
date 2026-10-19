"use client";

import { useLocale, useTranslations } from "next-intl";

import { ScenarioList } from "@/components/calc/ScenarioList";
import { DualAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import { usePrintDate } from "@/components/print/use-print-date";
import { Timeline } from "@/components/results/Timeline";
import { formatNumber } from "@/lib/calc/parse-amount";
import { stageSections, timelineKeyOf } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";
import { SITE_URL } from "@/lib/site";

/**
 * The plan as a printed page: it is hidden on the screen and is the only thing that prints (see the
 * print rules in calc.css). Light colours, A4, the page's own direction; nothing leaves the device.
 */
export function PlanPrint({ view }: { view: PlanView }) {
  const t = useTranslations();
  const language = useLocale() === "en" ? "en" : "ar";
  const date = usePrintDate(language);

  return (
    <section className="print-sheet">
      <PrintHeader view={view} date={date} />
      <PrintFacts view={view} />
      <h2>{t("print.stagesHeading")}</h2>
      <PrintStages view={view} />
      <h2>{t("results.timelineHeading")}</h2>
      <Timeline view={view} />
      <h2>{t("print.runwayHeading")}</h2>
      <PrintRunway view={view} />
      <p className="print-legal">{t("footer.legal")}</p>
      <p className="print-legal">
        {t("print.site")}{" "}
        <span className="ltr">
          {SITE_URL}/{language}
        </span>
      </p>
    </section>
  );
}

function PrintHeader({ view, date }: { view: PlanView; date: string }) {
  const t = useTranslations("print");
  const name = view.plan.name.trim();
  return (
    <header className="print-head">
      <h1>{name === "" ? t("untitled") : name}</h1>
      <p>
        DV Compass · {t("printedOn")}: {date}
      </p>
    </header>
  );
}

function PrintFacts({ view }: { view: PlanView }) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const { plan, result } = view;
  const rate = plan.rate.trim();

  return (
    <table className="print-facts">
      <tbody>
        <tr>
          <th scope="row">{t("results.household")}</th>
          <td>
            {t("results.householdValue", {
              adults: formatNumber(result.adults, locale, 0),
              children: formatNumber(result.children, locale, 0),
            })}
          </td>
        </tr>
        <tr>
          <th scope="row">{t("results.travel")}</th>
          <td>
            {result.follow === null
              ? t("results.travelTogether")
              : t("results.travelFollow", { months: formatNumber(result.follow.months, locale, 0) })}
          </td>
        </tr>
        <tr>
          <th scope="row">{t("print.currency")}</th>
          <td>{plan.localCurrency}</td>
        </tr>
        <tr>
          <th scope="row">{t("print.rate")}</th>
          <td>
            {rate === "" ? t("print.rateNone") : t("print.rateValue", { rate, code: plan.localCurrency })}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Each stage of the money timeline with the boxes that have an amount and the stage total. */
function PrintStages({ view }: { view: PlanView }) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const { result, plan } = view;
  const sections = stageSections(result);
  const months = formatNumber(result.follow?.months ?? 0, locale, 0);

  if (sections.length === 0) return <p>{t("print.stagesNone")}</p>;

  return (
    <>
      {sections.map((section) => (
        <table key={section.stage} className="print-stage">
          <caption>
            {t(`calc.timeline.${timelineKeyOf(section.stage, result.follow !== null)}.title`, { months })}
          </caption>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {t(`calc.items.${row.id}`)}
                  {row.multiplier > 1 ? (
                    <span className="print-times"> × {formatNumber(row.multiplier, locale, 0)}</span>
                  ) : null}
                </td>
                <td>
                  <DualAmount cents={row.cents} result={result} localCode={plan.localCurrency} />
                </td>
              </tr>
            ))}
            <tr className="print-sum">
              <td>{t("common.stageTotal")}</td>
              <td>
                <DualAmount cents={section.cents} result={result} localCode={plan.localCurrency} />
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </>
  );
}

/** The monthly costs, the savings and the job-start scenarios; with the phases when the family follows later. */
function PrintRunway({ view }: { view: PlanView }) {
  const t = useTranslations();
  const { result, plan } = view;
  const savings = plan.savings.raw.trim() === "" ? null : result.savingsCents;

  return (
    <>
      <table className="print-facts">
        <tbody>
          {result.follow === null ? null : (
            <tr>
              <th scope="row">{t("runway.monthlyAlone")}</th>
              <td>
                <DualAmount
                  cents={result.follow.aloneMonthlyCents}
                  result={result}
                  localCode={plan.localCurrency}
                />
              </td>
            </tr>
          )}
          <tr>
            <th scope="row">{result.follow === null ? t("results.monthly") : t("runway.monthlyFamily")}</th>
            <td>
              <DualAmount cents={result.monthlyCents} result={result} localCode={plan.localCurrency} />
            </td>
          </tr>
          <tr>
            <th scope="row">{t("results.savings")}</th>
            <td>
              <DualAmount cents={savings} result={result} localCode={plan.localCurrency} />
            </td>
          </tr>
        </tbody>
      </table>
      <ScenarioList view={view} />
    </>
  );
}

import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, Section, ToolDisclaimer, Bullets } from "@/components/ui";
import { FieldValue } from "@/components/FieldValue";
import { loadJobs } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    loadJobs().map((j) => ({ locale, slug: j.slug })),
  );
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const lang = locale as "ar" | "en";

  const job = loadJobs().find((j) => j.slug === slug);
  if (!job) notFound();

  const text = (v: { ar: string; en: string }) => (v[lang]?.trim() ? v[lang] : v.ar);

  return (
    <div className="space-y-8">
      <PageHeader title={job.name} lead={text(job.summary)} />

      <Card status="now">
        <dl className="p-4 space-y-2 text-sm">
          {([
            ["needsCar", job.needsCar],
            ["minCarYear", job.minCarYear],
            ["needsEnglish", job.needsEnglish],
            ["activation", job.activationDays],
            ["requiresSSN", job.requiresSSN],
          ] as const).map(([key, field]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-[var(--slate)]">{t(key)}</dt>
              <dd><FieldValue field={field as never} /></dd>
            </div>
          ))}
        </dl>
      </Card>

      {text(job.howItPays).trim() && (
        <Section title={t("howItPays")}>
          <p>{text(job.howItPays)}</p>
        </Section>
      )}

      <Section title={t("pros")}>
        <Bullets items={job.pros.map(text)} />
      </Section>

      <Section title={t("cons")}>
        <Bullets items={job.cons.map(text)} />
      </Section>

      <Section title={t("tips")}>
        <Bullets items={job.beginnerTips.map(text)} />
      </Section>

      <a
        href={job.signupUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block underline underline-offset-4"
      >
        {t("officialSignup")}
      </a>

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}

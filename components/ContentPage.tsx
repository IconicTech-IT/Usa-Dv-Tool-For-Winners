import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "./Card";
import { PageHeader, ToolDisclaimer } from "./ui";

interface SectionData {
  h: string;
  p: string;
  /** نقاط تحت الفقرة */
  list?: string[];
  /** كارت تحذير بدل كارت عادي */
  warn?: boolean;
}

/**
 * صفحات المحتوى كلها بتتبني من هنا.
 * كل النصوص في messages/ar.json و messages/en.json — مفيش نص في أي component.
 *
 * ⚠️ الصفحات دي **مبتحمّلش** GSAP ولا framer-motion. محتوى ثابت وخفيف.
 */
export async function ContentPage({
  locale,
  page,
}: {
  locale: string;
  page: string;
}) {
  setRequestLocale(locale);
  const t = await getTranslations(`pages.${page}`);
  const sections = t.raw("sections") as SectionData[];

  return (
    <article className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      {sections.map((s, i) => (
        <section key={i} className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight">{s.h}</h2>
          {s.warn ? (
            <Card status="danger">
              <div className="p-4 space-y-2">
                <p className="leading-relaxed">{s.p}</p>
                {s.list && <Bullets items={s.list} />}
              </div>
            </Card>
          ) : (
            <>
              <p className="leading-relaxed">{s.p}</p>
              {s.list && <Bullets items={s.list} />}
            </>
          )}
        </section>
      ))}

      <ToolDisclaimer text={t("disclaimer")} />
    </article>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 ps-5 list-disc marker:text-[var(--slate)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

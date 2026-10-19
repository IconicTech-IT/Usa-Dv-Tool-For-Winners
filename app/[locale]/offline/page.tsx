import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/lib/locale";
import type { PageProps } from "@/lib/page";

/** The page the service worker shows when there is no internet and the wanted page is not saved. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "offline" });
  return { title: t("title"), robots: { index: false } };
}

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "offline" });
  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <Link className="btn pr" href="/" style={{ marginTop: 18 }}>
        {t("home")}
      </Link>
    </>
  );
}

import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/** A clear 404 in the visitor's language, with a way back. */
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <>
      <h1>{t("notFoundTitle")}</h1>
      <p className="lead">{t("notFoundText")}</p>
      <Link href="/" className="btn pr mt-16">
        {t("goHome")}
      </Link>
    </>
  );
}

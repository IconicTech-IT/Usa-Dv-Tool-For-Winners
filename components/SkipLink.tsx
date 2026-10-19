import { getTranslations } from "next-intl/server";

/** Lets keyboard users jump past the header to the page content. */
export async function SkipLink() {
  const t = await getTranslations("header");
  return (
    <a href="#main" className="skip">
      {t("skipToContent")}
    </a>
  );
}

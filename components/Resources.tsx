import { getTranslations } from "next-intl/server";
import { Card } from "@/components/Card";
import { Section } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { loadResources } from "@/lib/content/load";

/**
 * دليل المواقع: فين تدوّر على شقة، على شغل، على عربية، على أثاث.
 *
 * ⚠️ الصفحة دي **مش صفحة مصادر**. `/sources` بتقول "أرقام الموقع جت
 * منين"، ودي بتقول "روح دوّر انت فين". الخلط بينهم بيخلي apartments.com
 * تبان كإنها مرجع رسمي للموقع، وهي مجرد مكان بيدوّر فيه الناس.
 *
 * ⚠️ ومفيش ولا لينك أفلييت هنا ولا هيبقى فيه — القاعدة الخامسة في
 * PROJECT-RULES: مجاني للأبد ومن غير عمولة. والصفحة بتقول ده صراحة،
 * لأن أول سؤال بيجي في بال حد بيشوف قايمة مواقع هو "واخد منهم كام؟".
 */
export async function Resources({ locale }: { locale: "ar" | "en" }) {
  const t = await getTranslations("resources");
  const data = loadResources();

  return (
    <div className="space-y-8">
      {/**
       * ⚠️ تحذير النصب فوق خالص، قبل أي لينك.
       *
       * نصب السكن بيستهدف اللي لسه بره تحديدًا: إعلان بصور حلوة وسعر
       * تحت السوق، وبيطلب تحويل "عربون" قبل ما توصل. اللي بيقرا القايمة
       * دي بيبقى بيدوّر بجد، فالتحذير لازم يوصله قبل ما يفتح أول لينك
       * مش بعد ما يقفل الصفحة.
       */}
      <Card status="danger">
        <div className="space-y-2 p-5">
          <h2 className="font-bold">{t("scamTitle")}</h2>
          <p className="text-sm">{t("scamLead")}</p>
          <ul className="space-y-1 text-sm">
            {["never", "video", "lease", "pressure"].map((k) => (
              <li key={k} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{t(`scamRules.${k}`)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            <Link href="/scams" className="underline underline-offset-4">
              {t("moreScams")}
            </Link>
          </p>
        </div>
      </Card>

      {data.categories.map((cat) => (
        <Section key={cat.id} title={cat.name[locale]}>
          <p className="text-[var(--slate)]">{cat.lead[locale]}</p>
          <ul className="space-y-3">
            {cat.sites.map((site) => (
              <Card key={site.url} as="li" status={site.official ? "done" : "later"}>
                <div className="space-y-1.5 p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {/**
                     * ⚠️ الخروج من الموقع لازم يبان.
                     * `rel="noopener"` أمان، و`target="_blank"` عشان اللي
                     * بيدوّر على شقة ميضيّعش خطته اللي لسه عاملها.
                     */}
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline underline-offset-4"
                    >
                      {site.name}
                    </a>
                    {site.official && (
                      <span className="badge badge--estimated">{t("officialBadge")}</span>
                    )}
                    <span className="num text-xs text-[var(--slate)]" dir="ltr">
                      {hostOf(site.url)}
                    </span>
                  </div>
                  <p className="text-sm">{site.what[locale]}</p>
                  {site.watch && (
                    <p className="text-sm text-[var(--alert)]">{site.watch[locale]}</p>
                  )}
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      ))}

      {/**
       * ⚠️ حالة اللينكات بتتقال زي أي رقم في الموقع.
       * `linksLastChecked: null` معناها محدش فتحهم بإيده لسه. نفس مبدأ
       * بادج "محتاج تأكيد" — نقول اللي إحنا متأكدين منه واللي لأ.
       */}
      <Card status="now">
        <div className="space-y-2 p-4 text-sm">
          <p className="font-bold">{t("noAffiliateTitle")}</p>
          <p>{t("noAffiliate")}</p>
          <p className="text-[var(--slate)]">
            {data.linksLastChecked
              ? t("checkedOn", { date: data.linksLastChecked })
              : t("notChecked")}
          </p>
        </div>
      </Card>
    </div>
  );
}

/** الدومين جنب الاسم — عشان يبان إنه رايح فين قبل ما يدوس. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

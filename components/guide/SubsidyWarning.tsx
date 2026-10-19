import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";
import { Link } from "@/i18n/navigation";

/**
 * On the health-insurance guide only: HealthCare.gov can offer a subsidy on the premium, which a new
 * immigrant must not take. This is the one place the site names a benefit, as a warning, and it points
 * to the public-charge page. A test allows exactly this text and nothing else about benefits.
 */
export async function SubsidyWarning() {
  const t = await getTranslations("guideHealth");
  return (
    <div className="rule tip">
      <Icon name="warning" />
      <div>
        <p>{t("subsidyWarning")}</p>
        <Link className="ilink" href="/charge">
          {t("subsidyWarningLink")}
        </Link>
      </div>
    </div>
  );
}

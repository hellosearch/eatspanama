import { getTranslations } from "next-intl/server";
import NewsletterForm from "@/components/NewsletterForm";

/**
 * Dark newsletter band (home/listing/guide footers). The form posts to
 * /api/subscribe (see NewsletterForm), which emails each signup to the capture
 * inbox via Resend.
 */
export default async function NewsletterBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Newsletter" });
  return (
    <div className="newsletter">
      <div>
        <h2>
          {t("bandTitle1")}
          <br />
          {t("bandTitle2")}
        </h2>
        <p className="es">{t("bandSub")}</p>
      </div>
      <NewsletterForm
        locale={locale}
        placeholder={t("emailPlaceholder")}
        ariaLabel={t("emailAria")}
        buttonLabel={t("signUp")}
      />
    </div>
  );
}

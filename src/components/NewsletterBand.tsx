import { getTranslations } from "next-intl/server";
import { Button } from "@/components/Buttons";

/**
 * Dark newsletter band (home/listing/guide footers). The form posts nowhere
 * yet - TODO(resend): wire to the Resend double-opt-in endpoint; until then
 * the whole band deep-links to /newsletter/.
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
      {/* No `name` on the input: submitting navigates to /newsletter/ without
          leaking the address into the URL. Real capture is the Resend ticket. */}
      <form action={locale === "es" ? "/es/newsletter/" : "/newsletter/"} method="get">
        <input type="email" placeholder={t("emailPlaceholder")} aria-label={t("emailAria")} />
        <Button type="submit" variant="accent">
          {t("signUp")}
        </Button>
      </form>
    </div>
  );
}

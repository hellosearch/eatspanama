import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("Search");
  return (
    <section className="block" style={{ minHeight: "50vh" }}>
      <p className="eyebrow">404</p>
      <h1 className="sec-title" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34 }}>
        {t("zeroBig")}
      </h1>
      <p className="sec-sub" style={{ maxWidth: 520 }}>
        {t("zeroSub")}
      </p>
      <p style={{ marginTop: 24 }}>
        <Link className="see-all" href="/">
          EatsPanama →
        </Link>
      </p>
    </section>
  );
}

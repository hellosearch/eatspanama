import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, withLocale } from "@/lib/paths";
import { localeAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { webPageJsonLd } from "@/lib/jsonld";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Privacy policy copy, bilingual. The policy is identical in both languages;
 *  only the wording changes. Native es-419, no em-dashes. */
const COPY = {
  en: {
    crumb: "Privacy",
    title: "Privacy policy",
    description:
      "A plain-language summary of what EatsPanama collects and why. Anonymous analytics, opt-in newsletter only, no sale of personal data.",
    lead:
      "This is a plain-language summary of what EatsPanama collects and why. (Final legal version pending review.)",
    collectLabel: "What we collect:",
    collectBody:
      "anonymous usage analytics (pages viewed, general location by region) to improve the site; your email address only if you subscribe to the newsletter; information you submit when you claim a listing or report a change.",
    dontLabel: "What we don't do:",
    dontBody:
      "we don't sell your personal data; we don't run invasive ad trackers on you; the newsletter is opt-in and one-click unsubscribe.",
    cookiesLabel: "Cookies:",
    cookiesBody: "minimal - what's needed to run the site and measure aggregate traffic.",
    contactLabel: "Contact:",
    contactBody: "to ask what we hold or to be removed.",
    draftNote:
      "Placeholder - a lawyer-reviewed policy (Panama + general jurisdictions, analytics/newsletter processor terms) replaces this before launch.",
  },
  es: {
    crumb: "Privacidad",
    title: "Política de privacidad",
    description:
      "Un resumen en lenguaje claro de lo que EatsPanama recopila y por qué. Analíticas anónimas, boletín solo con suscripción voluntaria, sin venta de datos personales.",
    lead:
      "Este es un resumen en lenguaje claro de lo que EatsPanama recopila y por qué. (La versión legal final está pendiente de revisión.)",
    collectLabel: "Qué recopilamos:",
    collectBody:
      "analíticas de uso anónimas (páginas vistas, ubicación general por región) para mejorar el sitio; tu correo electrónico solo si te suscribes al boletín; la información que envías cuando reclamas una ficha o reportas un cambio.",
    dontLabel: "Qué no hacemos:",
    dontBody:
      "no vendemos tus datos personales; no usamos rastreadores publicitarios invasivos; el boletín es voluntario y te puedes dar de baja con un clic.",
    cookiesLabel: "Cookies:",
    cookiesBody: "mínimas - solo las necesarias para operar el sitio y medir el tráfico de forma agregada.",
    contactLabel: "Contacto:",
    contactBody: "para preguntar qué información tenemos sobre ti o para pedir que la eliminemos.",
    draftNote:
      "Marcador de posición - una política revisada por un abogado (Panamá y jurisdicciones generales, términos de los proveedores de analíticas/boletín) reemplaza esto antes del lanzamiento.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = COPY[locale === "es" ? "es" : "en"];
  const title = `${c.title} | EatsPanama`;
  const alternates = localeAlternates(locale, "/privacy/");
  return {
    title,
    description: c.description,
    alternates,
    openGraph: { title, description: c.description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[locale === "es" ? "es" : "en"];
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const selfAbs = absoluteUrl(locale, "/privacy/");

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          { name: c.crumb, absUrl: selfAbs },
        ]}
      />

      <article className="legal">
        <h1>{c.title}</h1>
        <p className="lead">{c.lead}</p>

        <ul>
          <li>
            <b>{c.collectLabel}</b> {c.collectBody}
          </li>
          <li>
            <b>{c.dontLabel}</b> {c.dontBody}
          </li>
          <li>
            <b>{c.cookiesLabel}</b> {c.cookiesBody}
          </li>
          <li>
            <b>{c.contactLabel}</b> <a href="mailto:privacy@eatspanama.com">privacy@eatspanama.com</a>{" "}
            {c.contactBody}
          </li>
        </ul>

        <p className="draft-note">{c.draftNote}</p>
      </article>

      <JsonLd data={webPageJsonLd(c.title, selfAbs, c.description)} />
      <Footer locale={locale} />
    </>
  );
}

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

/** Contact page copy, bilingual. The policy is identical in both languages; only
 *  the wording changes. Native es-419, no em-dashes. */
const COPY = {
  en: {
    crumb: "Contact",
    title: "Contact EatsPanama",
    description:
      "Questions, corrections, press, or partnership - reach EatsPanama at hello@eatspanama.com. Restaurant owners can claim a listing or report a change.",
    lead: (
      <>
        Questions, corrections, press, or partnership - reach us at{" "}
        <a href="mailto:hello@eatspanama.com">hello@eatspanama.com</a>. Restaurant owners: use
        &ldquo;Claim your page&rdquo; to update your listing, or &ldquo;Report a change&rdquo; for a
        quick fix to hours or details. We read everything; we reply to what needs a reply.
      </>
    ),
    general: "General:",
    corrections: "Report a change / correction:",
    forRestaurants: "For restaurants (claims, listings):",
    howLead: "Not sure how a page gets made, or where the information comes from? Read",
    howLink: "how EatsPanama works",
  },
  es: {
    crumb: "Contacto",
    title: "Contacta a EatsPanama",
    description:
      "Preguntas, correcciones, prensa o alianzas - escríbenos a hello@eatspanama.com. Los dueños de restaurantes pueden reclamar su ficha o reportar un cambio.",
    lead: (
      <>
        Preguntas, correcciones, prensa o alianzas - escríbenos a{" "}
        <a href="mailto:hello@eatspanama.com">hello@eatspanama.com</a>. Dueños de restaurantes: usa
        &ldquo;Reclama tu página&rdquo; para actualizar tu ficha, o &ldquo;Reporta un cambio&rdquo;
        para corregir rápido los horarios o los detalles. Leemos todo; respondemos lo que necesita
        respuesta.
      </>
    ),
    general: "General:",
    corrections: "Reportar un cambio / corrección:",
    forRestaurants: "Para restaurantes (reclamos, fichas):",
    howLead: "¿No sabes cómo se arma una página, ni de dónde sale la información? Lee",
    howLink: "cómo funciona EatsPanama",
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
  const alternates = localeAlternates(locale, "/contact/");
  return {
    title,
    description: c.description,
    alternates,
    openGraph: { title, description: c.description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[locale === "es" ? "es" : "en"];
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const selfAbs = absoluteUrl(locale, "/contact/");
  const howHref = withLocale(locale, "/how-we-review/");

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

        <ul className="contact-list">
          <li>
            <b>{c.general}</b> <a href="mailto:hello@eatspanama.com">hello@eatspanama.com</a>
          </li>
          <li>
            <b>{c.corrections}</b>{" "}
            <a href="mailto:hello@eatspanama.com">hello@eatspanama.com</a>
          </li>
          <li>
            <b>{c.forRestaurants}</b>{" "}
            <a href="mailto:hello@eatspanama.com">hello@eatspanama.com</a>
          </li>
        </ul>

        <p>
          {c.howLead} <a href={howHref}>{c.howLink}</a>.
        </p>
      </article>

      <JsonLd data={webPageJsonLd(c.title, selfAbs, c.description)} />
      <Footer locale={locale} />
    </>
  );
}

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

/** Terms of use copy, bilingual. The terms are identical in both languages;
 *  only the wording changes. Native es-419, no em-dashes. */
const COPY = {
  en: {
    crumb: "Terms",
    title: "Terms of use",
    description:
      "Plain-language summary of using EatsPanama - an independent editorial guide compiled from public information. Rankings and reviews are editorial and not for sale.",
    lead: "Plain-language summary of using EatsPanama. (Final legal version pending review.)",
    items: [
      "EatsPanama is an independent editorial guide. Listings are compiled from public information and offered for general guidance; details like hours and prices change - confirm with the venue.",
      "Content (our original text, our photos) is ours; don't republish it wholesale without permission. Restaurant trademarks belong to their owners.",
      "No warranty that every detail is current or error-free; we fix reported errors promptly.",
      "Rankings and reviews are editorial and not for sale.",
    ],
    draftNote: "Placeholder - a lawyer-reviewed terms of service replaces this before launch.",
  },
  es: {
    crumb: "Términos",
    title: "Términos de uso",
    description:
      "Resumen en lenguaje claro sobre el uso de EatsPanama - una guía editorial independiente compilada a partir de información pública. Los rankings y las reseñas son editoriales y no están a la venta.",
    lead: "Resumen en lenguaje claro sobre el uso de EatsPanama. (La versión legal final está pendiente de revisión.)",
    items: [
      "EatsPanama es una guía editorial independiente. Las fichas se compilan a partir de información pública y se ofrecen como orientación general; datos como los horarios y los precios cambian - confírmalos con el local.",
      "El contenido (nuestro texto original, nuestras fotos) es nuestro; no lo republiques de forma íntegra sin permiso. Las marcas de los restaurantes pertenecen a sus dueños.",
      "No garantizamos que cada dato esté actualizado o libre de errores; corregimos con prontitud los errores que nos reportan.",
      "Los rankings y las reseñas son editoriales y no están a la venta.",
    ],
    draftNote:
      "Marcador de posición - unos términos de servicio revisados por un abogado reemplazan esto antes del lanzamiento.",
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
  const alternates = localeAlternates(locale, "/terms/");
  return {
    title,
    description: c.description,
    alternates,
    openGraph: { title, description: c.description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[locale === "es" ? "es" : "en"];
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const selfAbs = absoluteUrl(locale, "/terms/");

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
          {c.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="draft-note">{c.draftNote}</p>
      </article>

      <JsonLd data={webPageJsonLd(c.title, selfAbs, c.description)} />
      <Footer locale={locale} />
    </>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { absoluteUrl, withLocale } from "@/lib/paths";
import { allVenues } from "@/lib/data";
import { formatMonth } from "@/lib/format";
import { localeAlternates, indexable, OG_DEFAULT_IMAGE } from "@/lib/seo";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { faqJsonLd, webPageJsonLd } from "@/lib/jsonld";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The trust page is now a native-ES twin, not an EN fallback: ES is 60% of
 * demand and this is the page whose whole job is earning a skeptic's trust, so
 * serving it in English to a Spanish-first reader was a real conversion leak.
 * Both languages carry proper self-canonical + es<->en hreflang.
 *
 * NOTE: the Spanish below was authored to match the English meaning + the
 * brand voice; a native-speaker review pass before it is treated as final is
 * still worthwhile (the es_reviewed editor gate).
 */
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function monthLabel(stamp: string | undefined, locale: string): string {
  if (!stamp) return "";
  if (locale !== "es") return formatMonth(stamp);
  const [y, m] = stamp.split("-");
  const idx = parseInt(m, 10) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS_ES[idx]} ${y}` : formatMonth(stamp);
}

const COPY = {
  en: {
    title: "How EatsPanama works",
    description:
      "How EatsPanama works: an independent guide to eating in Panama, built from public sources, with a curated editorial layer in the works. No paid rankings, no star ratings, ever.",
    lead:
      "EatsPanama is an independent guide to eating in Panama. No restaurant can pay to rank higher, and we never publish star ratings.",
    freshness: (m: string) =>
      `Directory hours were last refreshed ${m}. We recheck hours and closures on a rolling monthly basis, and every listing shows when it was last verified.`,
    h_pages: "Two kinds of pages",
    pages_intro_a: "Every restaurant on EatsPanama has a ",
    pages_listing: "Listing",
    pages_intro_b: ". A curated set will also have an ",
    pages_editorial: "Editorial review",
    pages_intro_c: ".",
    listing_label: "Listings (most places).",
    listing_body:
      " Built from public information - the restaurant's own website and social channels, its menu, and public directories - and restated in our own words. We show what kind of food it serves, notable dishes and prices where a menu is public, what people consistently say about it (distilled from public mentions, never as a star score), hours, and location. If a fact isn't publicly available, we leave that section off rather than guess. Listings are not personal reviews and don't claim we have visited.",
    editorial_label: "Editorial reviews (a curated tier we're adding).",
    editorial_body:
      " When our team reviews a place in person, that page will carry a signed review with a visit date, on top of the listing. Those reviews will cover their own tab, won't accept press invitations in exchange for coverage, and each will say plainly when we were there.",
    h_never: "What we will never do",
    never: [
      "Sell rankings or reviews. Placement is never for sale.",
      "Publish star ratings or scraped review scores.",
      "Copy another site's menu descriptions, reviews, or photos.",
      "Take a restaurant's money to remove a factual listing.",
    ],
    h_data: "Where the data comes from",
    data_body:
      "Restaurant names, locations, and hours come from public sources and are restated as facts. Menus, dishes, and what's-good notes come from each venue's own public channels and public write-ups, synthesized in our words. Maps are from OpenStreetMap. Photos on an unclaimed listing are a branded placeholder - real photos arrive when an owner claims the page or when we photograph a place ourselves.",
    h_owners: "Owners - claim your page",
    owners_body:
      "If you run a restaurant here, you can claim your listing for free to add photos, correct your hours and menu, and add a booking link. Claiming doesn't change your ranking and doesn't buy a review. ",
    owners_cta: "Claim your page",
    h_wrong: "Spot something wrong?",
    wrong_body: "Hours change, places close, menus move. Tell us and we'll fix it. ",
    wrong_cta: "Report a change",
    faqs: [
      {
        q: "Does an EatsPanama listing mean you visited the restaurant?",
        a: "No. Most pages are Listings built from public information - the restaurant's own website and social channels, its menu, and public directories - restated in our own words. Only a smaller, curated set will also have an Editorial review, which will carry a signed visit date. Listings are not personal reviews and don't claim we have visited.",
      },
      {
        q: "Can a restaurant pay to rank higher or get a better review on EatsPanama?",
        a: "No. Placement is never for sale. We never sell rankings or reviews, never publish star ratings or scraped review scores, and never take a restaurant's money to remove a factual listing.",
      },
      {
        q: "Where does EatsPanama's data come from?",
        a: "Restaurant names, locations, and hours come from public sources and are restated as facts. Menus, dishes, and what's-good notes come from each venue's own public channels and public write-ups, synthesized in our words. Maps are from OpenStreetMap. Photos on an unclaimed listing are a branded placeholder - real photos arrive when an owner claims the page or when we photograph a place ourselves.",
      },
    ],
  },
  es: {
    title: "Cómo funciona EatsPanama",
    description:
      "Cómo funciona EatsPanama: una guía independiente para comer en Panamá, construida a partir de fuentes públicas, con una capa editorial curada en camino. Sin rankings pagados, sin calificaciones de estrellas, nunca.",
    lead:
      "EatsPanama es una guía independiente para comer en Panamá. Ningún restaurante puede pagar para posicionarse más arriba, y nunca publicamos calificaciones de estrellas.",
    freshness: (m: string) =>
      `Los horarios del directorio se actualizaron por última vez en ${m}. Revisamos horarios y cierres de forma continua cada mes, y cada perfil muestra cuándo se verificó por última vez.`,
    h_pages: "Dos tipos de páginas",
    pages_intro_a: "Cada restaurante en EatsPanama tiene un ",
    pages_listing: "Perfil",
    pages_intro_b: ". Un grupo curado también tendrá una ",
    pages_editorial: "reseña editorial",
    pages_intro_c: ".",
    listing_label: "Perfiles (la mayoría de los lugares).",
    listing_body:
      " Construidos a partir de información pública -el sitio web y las redes del propio restaurante, su menú y directorios públicos- y reescritos con nuestras propias palabras. Mostramos qué tipo de comida sirve, platos y precios destacados cuando el menú es público, lo que la gente dice de forma consistente (destilado de menciones públicas, nunca como una calificación de estrellas), horarios y ubicación. Si un dato no está disponible públicamente, dejamos esa sección fuera en lugar de adivinar. Los perfiles no son reseñas personales y no afirman que hayamos visitado el lugar.",
    editorial_label: "Reseñas editoriales (un grupo curado que estamos sumando).",
    editorial_body:
      " Cuando nuestro equipo reseñe un lugar en persona, esa página tendrá una reseña firmada con fecha de visita, además del perfil. Esas reseñas pagarán su propia cuenta, no aceptarán invitaciones de prensa a cambio de cobertura, y cada una dirá claramente cuándo estuvimos ahí.",
    h_never: "Lo que nunca haremos",
    never: [
      "Vender rankings o reseñas. El posicionamiento nunca está a la venta.",
      "Publicar calificaciones de estrellas o puntajes de reseñas extraídos de otros sitios.",
      "Copiar las descripciones de menú, reseñas o fotos de otro sitio.",
      "Aceptar dinero de un restaurante para eliminar un perfil basado en hechos.",
    ],
    h_data: "De dónde vienen los datos",
    data_body:
      "Los nombres, ubicaciones y horarios de los restaurantes provienen de fuentes públicas y se presentan como hechos. Los menús, platos y notas de lo bueno provienen de los canales públicos de cada local y de reseñas públicas, sintetizados con nuestras palabras. Los mapas son de OpenStreetMap. Las fotos en un perfil no reclamado son un marcador de posición de marca; las fotos reales llegan cuando un dueño reclama la página o cuando fotografiamos el lugar nosotros mismos.",
    h_owners: "Dueños: reclamen su página",
    owners_body:
      "Si tienes un restaurante aquí, puedes reclamar tu perfil gratis para agregar fotos, corregir tus horarios y menú, y añadir un enlace de reservas. Reclamar no cambia tu posicionamiento y no compra una reseña. ",
    owners_cta: "Reclama tu página",
    h_wrong: "¿Viste algo incorrecto?",
    wrong_body: "Los horarios cambian, los lugares cierran, los menús se mueven. Avísanos y lo corregimos. ",
    wrong_cta: "Reportar un cambio",
    faqs: [
      {
        q: "¿Un perfil en EatsPanama significa que visitaron el restaurante?",
        a: "No. La mayoría de las páginas son Perfiles construidos con información pública -el sitio web y las redes del restaurante, su menú y directorios públicos- reescritos con nuestras propias palabras. Solo un grupo más pequeño y curado tendrá una reseña editorial, que llevará una fecha de visita firmada. Los perfiles no son reseñas personales y no afirman que hayamos visitado.",
      },
      {
        q: "¿Un restaurante puede pagar para posicionarse más arriba o tener una mejor reseña en EatsPanama?",
        a: "No. El posicionamiento nunca está a la venta. Nunca vendemos rankings ni reseñas, nunca publicamos calificaciones de estrellas ni puntajes extraídos de otros sitios, y nunca aceptamos dinero de un restaurante para eliminar un perfil basado en hechos.",
      },
      {
        q: "¿De dónde vienen los datos de EatsPanama?",
        a: "Los nombres, ubicaciones y horarios provienen de fuentes públicas y se presentan como hechos. Los menús, platos y notas de lo bueno provienen de los canales públicos de cada local y de reseñas públicas, sintetizados con nuestras palabras. Los mapas son de OpenStreetMap. Las fotos en un perfil no reclamado son un marcador de marca; las fotos reales llegan cuando un dueño reclama la página o cuando fotografiamos el lugar nosotros mismos.",
      },
    ],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = COPY[locale === "es" ? "es" : "en"];
  const title = `${c.title} | EatsPanama`;
  const alternates = localeAlternates(locale, "/how-we-review/");
  return {
    title,
    description: c.description,
    alternates,
    openGraph: { title, description: c.description, url: alternates.canonical, images: [OG_DEFAULT_IMAGE] },
    robots: indexable(),
  };
}

export default async function HowWeReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[locale === "es" ? "es" : "en"];
  const tl = await getTranslations({ locale, namespace: "Listing" });
  const selfAbs = absoluteUrl(locale, "/how-we-review/");
  const claimHref = withLocale(locale, "/contact/");
  const freshest = allVenues.map((v) => v.last_checked).filter(Boolean).sort().pop();

  return (
    <>
      <Breadcrumb
        crumbs={[
          { name: tl("home"), href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
          { name: c.title, absUrl: selfAbs },
        ]}
      />

      <article className="legal">
        <h1>{c.title}</h1>
        <p className="lead">{c.lead}</p>
        {freshest && (
          <p className="freshness-note">{c.freshness(monthLabel(freshest, locale))}</p>
        )}

        <h2>{c.h_pages}</h2>
        <p>
          {c.pages_intro_a}
          <b>{c.pages_listing}</b>
          {c.pages_intro_b}
          <b>{c.pages_editorial}</b>
          {c.pages_intro_c}
        </p>
        <ul>
          <li>
            <b>{c.listing_label}</b>
            {c.listing_body}
          </li>
          <li>
            <b>{c.editorial_label}</b>
            {c.editorial_body}
          </li>
        </ul>

        <h2>{c.h_never}</h2>
        <ul>
          {c.never.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <h2>{c.h_data}</h2>
        <p>{c.data_body}</p>

        <h2>{c.h_owners}</h2>
        <p>
          {c.owners_body}
          <a href={claimHref}>{c.owners_cta}</a>
        </p>

        <h2>{c.h_wrong}</h2>
        <p>
          {c.wrong_body}
          <a href={claimHref}>{c.wrong_cta}</a>
        </p>
      </article>

      <JsonLd data={[webPageJsonLd(c.title, selfAbs, c.description), faqJsonLd(c.faqs as unknown as { q: string; a: string }[])]} />
      <Footer locale={locale} />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { allNeighborhoods, getGuide, getGuides, getVenue, guides } from "@/lib/data";
import { absoluteUrl, cityPath, listingPath, venuePath, withLocale } from "@/lib/paths";
import { localeAlternates, indexable, ogBase } from "@/lib/seo";
import { localizeGuide, localizeVenue } from "@/lib/localize";
import { articleJsonLd, faqJsonLd } from "@/lib/jsonld";
import { displayName, formatDishPrice, formatMonth, guideUpdated, priceGlyphs, whatsappUrl } from "@/lib/format";
import Breadcrumb from "@/components/Breadcrumb";
import FilterChip from "@/components/FilterChip";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import NewsletterBand from "@/components/NewsletterBand";
import PhotoCredit from "@/components/PhotoCredit";
import { toClientPhoto } from "@/lib/client-photo";
import GuideToc from "@/components/GuideToc";
import { VerifiedStamp } from "@/components/badges";
import { WhatsAppButton } from "@/components/Buttons";
import { CheckIcon } from "@/components/icons";

interface Params {
  locale: string;
  slug: string;
}

/**
 * Guide-page UI chrome, bilingual. The article PROSE (title, intro, verdicts,
 * criteria, FAQs) is swapped from the `_es` twins by localizeGuide; this covers
 * the surrounding labels the template hard-codes (breadcrumb, stamps, section
 * headings, CTAs) so an ES guide reads fully in Spanish.
 */
const GUIDE_UI = {
  en: {
    home: "Home",
    guides: "Guides",
    compiled: (n: number) =>
      `Compiled by the EatsPanama editors from ${n} qualifying places we cover in Panama City.`,
    heroAbove: (name: string) => `Above: ${name}, number one on this list.`,
    inThisGuide: "In this guide",
    inOrder: (n: number) => `The ${n}, in order`,
    hoursChecked: (m: string) => `Hours checked ${m}`,
    singleOut: "What diners single out",
    bestTime: "Best time:",
    onMenu: "On the menu",
    waMsg: "Message on WhatsApp",
    fullDetails: "Full details, hours and map →",
    howChosen: "How this list was chosen",
    methodNote:
      "We have not eaten at every place on this list, and we do not pretend otherwise. What each kitchen is known for is distilled from public diner feedback; the hours, address and menu details come from the venue's own sources.",
    quickAnswers: "Quick answers",
    fullList: "The full list",
    browseAll: "Browse every restaurant in Panama City",
    browseAllSub: "The complete, filterable directory - every neighborhood, cuisine and price tier.",
    browseCta: "Browse the directory →",
    places: (n: number) => `${n} places`,
    readGuide: "Read the guide →",
  },
  es: {
    home: "Inicio",
    guides: "Guías",
    compiled: (n: number) =>
      `Compilado por los editores de EatsPanama a partir de ${n} lugares aptos que cubrimos en la Ciudad de Panamá.`,
    heroAbove: (name: string) => `Arriba: ${name}, el número uno de esta lista.`,
    inThisGuide: "En esta guía",
    inOrder: (n: number) => `Los ${n}, en orden`,
    hoursChecked: (m: string) => `Horarios verificados en ${m}`,
    singleOut: "Lo que más destacan los comensales",
    bestTime: "Mejor momento:",
    onMenu: "En el menú",
    waMsg: "Escribir por WhatsApp",
    fullDetails: "Detalles completos, horarios y mapa →",
    howChosen: "Cómo se eligió esta lista",
    methodNote:
      "No hemos comido en cada lugar de esta lista, y no pretendemos lo contrario. Lo que distingue a cada cocina se resume a partir de opiniones públicas de comensales; los horarios, la dirección y los detalles del menú provienen de las fuentes del propio local.",
    quickAnswers: "Respuestas rápidas",
    fullList: "La lista completa",
    browseAll: "Explora todos los restaurantes de la Ciudad de Panamá",
    browseAllSub: "El directorio completo y filtrable: cada barrio, cocina y rango de precio.",
    browseCta: "Explorar el directorio →",
    places: (n: number) => `${n} lugares`,
    readGuide: "Leer la guía →",
  },
} as const;

export function generateStaticParams() {
  return guides.filter((g) => g.entries.length > 0).map((g) => ({ slug: g.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const guideRaw = await getGuide(slug);
  if (!guideRaw) return {};
  const guide = localizeGuide(guideRaw, locale);
  const title = `${guide.title_en} | EatsPanama`;
  // Guide slug is not localized (/es/guides/<slug>/), so EN + ES share the path;
  // localeAlternates emits the self-referential canonical + paired hreflang.
  const alternates = localeAlternates(locale, `/guides/${guide.slug}/`);
  return {
    title,
    description: guide.description_en,
    alternates,
    openGraph: {
      ...ogBase(locale),
      title,
      description: guide.description_en,
      url: alternates.canonical,
      // og:image from the generated guide card (./opengraph-image).
    },
    robots: indexable(),
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const guideRaw = await getGuide(slug);
  if (!guideRaw || guideRaw.entries.length === 0) notFound();
  const guide = localizeGuide(guideRaw, locale);

  const selfAbs = absoluteUrl(locale, `/guides/${guide.slug}/`);
  const allGuides = (await getGuides()).map((g) => localizeGuide(g, locale));
  const related = allGuides.filter((g) => g.slug !== guide.slug);

  const entryVenues = await Promise.all(
    guide.entries.map(async (e) => {
      const v = await getVenue(e.venue_slug);
      return { entry: e, venue: v ? localizeVenue(v, locale) : v };
    })
  );

  // allNeighborhoods, not the mock array: the prototype array held 4 of the 15
  // neighborhoods, so half the entries on a city-wide guide rendered with
  // href="#" instead of a link to the venue.
  const hoodFor = (slugN: string) => allNeighborhoods.find((n) => n.slug === slugN);
  const C = GUIDE_UI[locale === "es" ? "es" : "en"];

  return (
    <>
      {/* ARTICLE HEADER - text first in DOM */}
      <div className="article-col">
        <Breadcrumb
          variant="article"
          crumbs={[
            { name: C.home, href: withLocale(locale, "/"), absUrl: absoluteUrl(locale, "/") },
            { name: C.guides, href: withLocale(locale, "/guides/"), absUrl: absoluteUrl(locale, "/guides/") },
            { name: guide.title_en.split(":")[0], absUrl: selfAbs },
          ]}
        />

        <h1 className="g-title">{guide.title_en}</h1>

        {/* No named byline: these lists are compiled from the venue database,
            not written up from visits, and inventing an author to sign them
            would be the same lie in a smaller font. */}
        <div className="stamp-row">
          <VerifiedStamp>{guideUpdated(guide.updated_iso)}</VerifiedStamp>
          <span className="fresh-note">{C.compiled(guide.pool_size)}</span>
        </div>

        <p className="g-intro">{guide.intro_en}</p>
      </div>

      {/* HERO IMAGE BAND (after the text, by design). The photo belongs to a
          venue ON this list and keeps its credit - we never use stock. */}
      {guide.hero && (
        <>
          <div className="g-heroband">
            <Image src={guide.hero.url} alt={guide.hero.alt_en} fill sizes="100vw" className="img-cover" priority />
          </div>
          <p className="g-caption">
            {C.heroAbove(displayName(guide.hero.venue_name))}{" "}
            {guide.hero.credit_en && (
              <PhotoCredit
                text={guide.hero.credit_en}
                href={toClientPhoto(guide.hero).credit_href}
              />
            )}
          </p>
        </>
      )}

      {/* Grid so the sticky ToC rail can sit beside the article at >=1200px;
          below that it collapses to a single centered column and the inline
          TocCard (hidden on desktop) carries the anchors. */}
      <div className="guide-body">
        <GuideToc
          title={C.inThisGuide}
          items={guide.toc.map((t) => ({ slug: t.slug, name: displayName(t.name) }))}
        />
        <div className="article-col guide-main">
          {/* VENUE ENTRIES - one H2 per venue. (The mobile jump nav is the sticky
              GuideToc bar above; the desktop rail sits beside this column.) */}
        {entryVenues.map(({ entry, venue }, i) => {
          if (!venue) return null;
          const hood = hoodFor(venue.neighborhood_slug);
          const hoodHref = hood ? withLocale(locale, listingPath(hood.city_slug, hood.slug, locale)) : "#";
          const profileHref = hood
            ? withLocale(locale, venuePath(hood.city_slug, venue.slug, locale))
            : "#";
          const photo = venue.photos[0];
          return (
            <article className="g-venue" id={venue.slug} key={venue.slug}>
              <h2>
                <span className="vnum">{i + 1}.</span>
                <a href={profileHref}>{displayName(venue.name)}</a>
              </h2>
              <div className="v-facts">
                {venue.price_tier > 0 && <FilterChip price>{priceGlyphs(venue.price_tier)}</FilterChip>}
                {hood && <FilterChip href={hoodHref}>{hood.name}</FilterChip>}
                {venue.tags_en.slice(0, 1).map((tag) => (
                  <FilterChip key={tag}>{tag}</FilterChip>
                ))}
                <VerifiedStamp>{C.hoursChecked(formatMonth(venue.verified_at, locale))}</VerifiedStamp>
              </div>
              {photo && (
                <div className="v-photo">
                  {/* Eager-load the first couple so a credit chip never floats
                      over a blank box during lazy pop-in. */}
                  <Image src={photo.url} alt={photo.alt_en} fill sizes="760px" className="img-cover" priority={i < 2} />
                  {photo.credit_en && (
                    <PhotoCredit
                      text={photo.credit_en}
                      href={toClientPhoto(photo).credit_href}
                    />
                  )}
                </div>
              )}

              <p className="v-verdict">{entry.summary_en}</p>

              {entry.known_for_en.length > 0 && (
                <div className="v-known">
                  <p className="k-label">{C.singleOut}</p>
                  <ul>
                    {entry.known_for_en.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.best_time_en && (
                <p className="v-when">
                  <b>{C.bestTime}</b> {entry.best_time_en}
                </p>
              )}

              {entry.order_dish && (
                <div className="order-line">
                  <span className="o-label">{C.onMenu}</span>
                  <span className="o-dish">{entry.order_dish.name}</span>
                  <span className="o-price">{formatDishPrice(entry.order_dish.price)}</span>
                </div>
              )}

              <div className="v-actions">
                {venue.phones.whatsapp && (
                  <WhatsAppButton
                    size="mini"
                    href={whatsappUrl(venue.phones.whatsapp)}
                    label={C.waMsg}
                  />
                )}
                <a className="hood-link" href={profileHref}>
                  {C.fullDetails}
                </a>
              </div>
            </article>
          );
        })}

        {/* METHODOLOGY - the criteria this list was actually built on, printed
            from the same values the generator selected with. */}
        <section className="method">
          <h2>{C.howChosen}</h2>
          <ul>
            {guide.criteria_en.map((c) => (
              <li key={c}>
                <CheckIcon />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="method-note">{C.methodNote}</p>
        </section>

        {/* FAQ */}
        <section className="faq-stack">
          <h2>{C.quickAnswers}</h2>
          {guide.faqs_en.map((f) => (
            <div className="qa" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        {/* INTERLINK BAND (hub-spoke) - real targets, computed counts */}
        <section className="interlink">
          <div className="il-grid">
            <a className="il-hub" href={withLocale(locale, cityPath("panama-city", locale))}>
              <p className="eyebrow">{C.fullList}</p>
              <h3>{C.browseAll}</h3>
              <p>{C.browseAllSub}</p>
              <span className="go">{C.browseCta}</span>
            </a>
            {related.map((g) => (
              <a
                className="card il-rel"
                key={g.slug}
                href={withLocale(locale, `/guides/${g.slug}/`)}
              >
                <div className="badges">
                  <span className="count-pill">{C.places(g.entries.length)}</span>
                </div>
                <h3>{g.title_en}</h3>
                <span className="go">{C.readGuide}</span>
              </a>
            ))}
          </div>
        </section>
        </div>
      </div>

      <JsonLd data={[articleJsonLd(guide, selfAbs), faqJsonLd(guide.faqs_en)]} />
      <NewsletterBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}

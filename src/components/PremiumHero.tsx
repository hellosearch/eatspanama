import Image from "next/image";
import type { DayHours } from "@/data/mock";
import OpenNowPill from "@/components/OpenNowPill";
import PhotoCredit from "@/components/PhotoCredit";
import HeroVideo from "@/components/HeroVideo";
import PhotoLightbox, { type LightboxPhoto } from "@/components/PhotoLightbox";

export interface HeroPhoto {
  url: string;
  alt?: string;
  creditText?: string;
  creditHref?: string;
}

export interface HeroVideoSources {
  srcMobile: string;
  srcDesktop?: string;
  poster: string;
}

export interface LightboxLabels {
  seeAll: string;
  close: string;
  prev: string;
  next: string;
}

/**
 * Premium-tier hero: a compact banner playing a muted, title-free film loop
 * (16:9 on desktop, 9:16 on phones) behind the name, price band and open-now
 * state. The still photos live in a "See all photos" lightbox rather than a
 * strip. No self-awarded badge - the distinction on a premium page is the real
 * review, not a stamp. Basic-tier profiles never render this.
 */
export default function PremiumHero({
  name,
  metaText,
  priceBand,
  photos,
  video,
  videoCredit,
  hours,
  lastChecked,
  locale = "en",
  lightboxLabels,
  unmuteLabel,
  muteLabel,
}: {
  name: string;
  metaText: string;
  priceBand?: string;
  photos: HeroPhoto[];
  video?: HeroVideoSources;
  videoCredit?: string;
  hours: DayHours[];
  lastChecked?: string;
  locale?: string;
  lightboxLabels: LightboxLabels;
  unmuteLabel: string;
  muteLabel: string;
}) {
  const cover = photos[0];
  const coverUrl = video?.poster ?? cover?.url;
  const coverAlt = cover?.alt ?? name;
  const lbPhotos: LightboxPhoto[] = photos.map((p) => ({ url: p.url, alt: p.alt }));

  return (
    <section className="prem-hero" aria-label={name}>
      <div className={`prem-hero-media${video ? " has-video" : ""}`}>
        {coverUrl ? (
          <Image src={coverUrl} alt={coverAlt} fill sizes="(max-width: 1000px) 100vw, 1280px" className="img-cover" priority />
        ) : (
          <span className="prem-hero-fallback" aria-hidden="true" />
        )}
        {video && (
          <HeroVideo
            srcMobile={video.srcMobile}
            srcDesktop={video.srcDesktop}
            poster={video.poster}
            unmuteLabel={unmuteLabel}
            muteLabel={muteLabel}
          />
        )}
        <span className="prem-hero-scrim" aria-hidden="true" />
        {lbPhotos.length > 0 && (
          <PhotoLightbox
            photos={lbPhotos}
            openLabel={lightboxLabels.seeAll}
            closeLabel={lightboxLabels.close}
            prevLabel={lightboxLabels.prev}
            nextLabel={lightboxLabels.next}
          />
        )}
        {video && videoCredit ? (
          <span className="prem-hero-credit prem-film-credit">{videoCredit}</span>
        ) : (
          !video && cover?.creditText && cover.creditHref && (
            <PhotoCredit text={cover.creditText} href={cover.creditHref} className="prem-hero-credit photo-credit" />
          )
        )}
        <div className="prem-hero-copy">
          <h1>{name}</h1>
          <div className="prem-hero-foot">
            {priceBand && <span className="prem-price">{priceBand}</span>}
            <span className="prem-meta">{metaText}</span>
            <OpenNowPill hours={hours} lastChecked={lastChecked} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}

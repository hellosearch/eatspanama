import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/Buttons";

/**
 * The signature offset-shadow search card. A plain GET form to /search
 * (crawl-safe, works without JS). Instant-search upgrade is the Typesense
 * ticket.
 */
export default function SearchCard({
  locale,
  placeholder,
  buttonLabel,
  ariaLabel,
  defaultValue,
}: {
  locale: string;
  placeholder?: string;
  buttonLabel: string;
  ariaLabel: string;
  defaultValue?: string;
}) {
  return (
    <form className="search-card" action={locale === "es" ? "/es/search/" : "/search/"} method="get" role="search">
      <SearchIcon />
      <input
        type="text"
        name="q"
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
      />
      <Button type="submit" variant="accent">
        {buttonLabel}
      </Button>
    </form>
  );
}

// JSON-LD builders for the structured data pass (spec: "Person/LocalBusiness"
// on coach pages, "ItemList" on listing pages, "BreadcrumbList" everywhere
// with a real hierarchy). Plain objects in, rendered via
// src/components/json-ld.tsx — kept out of the page components so the
// schema shape lives in one place.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${siteUrl}${path}`;
}

export type BreadcrumbItem = { name: string; url: string };

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export type ItemListEntry = { name: string; url: string };

// Used on discipline/area listing pages — the coaches shown, not the
// listing page itself. Google treats ItemList as a hint for rich results
// on category-style pages, not a ranking signal on its own.
export function itemListSchema(items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}

export type CoachSchemaInput = {
  name: string;
  slug: string;
  headline: string;
  bio: string;
  suburb: string;
  state: string;
  lat: number | null;
  long: number | null;
  photoUrl: string | null;
  disciplineNames: string[];
};

// Person, not LocalBusiness/Organization — coaches on ECA are individuals,
// not registered businesses (that's EquiDirectory's model, not this one).
// knowsAbout carries the disciplines; aliases (bridleless → "at liberty",
// "groundwork") deliberately don't appear here — the spec's "four places"
// rule for aliases doesn't include structured data beyond alternateName,
// and disciplineNames are already the canonical term names.
export function coachPersonSchema(coach: CoachSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: coach.name,
    url: absoluteUrl(`/coaches/${coach.slug}`),
    ...(coach.photoUrl ? { image: coach.photoUrl } : {}),
    description: coach.headline || coach.bio || undefined,
    jobTitle: "Riding Coach",
    address: {
      "@type": "PostalAddress",
      addressLocality: coach.suburb,
      addressRegion: coach.state,
      addressCountry: "AU",
    },
    ...(coach.lat != null && coach.long != null
      ? { geo: { "@type": "GeoCoordinates", latitude: coach.lat, longitude: coach.long } }
      : {}),
    ...(coach.disciplineNames.length > 0 ? { knowsAbout: coach.disciplineNames } : {}),
  };
}

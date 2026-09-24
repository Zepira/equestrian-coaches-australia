// JSON-LD builders for the structured data pass (spec: "Person/LocalBusiness"
// on coach pages, "ItemList" on listing pages, "BreadcrumbList" everywhere
// with a real hierarchy). Plain objects in, rendered via
// src/components/json-ld.tsx — kept out of the page components so the
// schema shape lives in one place.

import { absoluteUrl } from "@/lib/site-url";
import { eventPath, profilePath } from "@/lib/page-paths";

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

export type ProviderSchemaInput = {
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
  skillNames?: string[];
  /** From the primary profession's row (profession_details.job_title). */
  jobTitle: string;
  businessName?: string | null;
};

/**
 * A provider's profile markup (The Site as a CMS §05.6). A Person, whose
 * job title comes from their primary profession's row ("Riding coach",
 * "Farrier") and whose knowsAbout is their disciplines or specialities
 * plus skills: real search terms, canonical names only (aliases stay out,
 * per the spec's "four places" rule). A provider who trades under a
 * business name also gets a LocalBusiness they work for, at the same
 * address; one without stays a Person, since most are individuals.
 */
export function providerSchemas(p: ProviderSchemaInput) {
  const url = absoluteUrl(profilePath(p.slug));
  const address = { "@type": "PostalAddress", addressLocality: p.suburb, addressRegion: p.state, addressCountry: "AU" };
  const geo = p.lat != null && p.long != null ? { geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.long } } : {};
  const knows = [...p.disciplineNames, ...(p.skillNames ?? [])];
  const business = p.businessName?.trim()
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${url}#business`,
        name: p.businessName.trim(),
        url,
        address,
        ...geo,
        ...(p.photoUrl ? { image: p.photoUrl } : {}),
      }
    : null;
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url,
    ...(p.photoUrl ? { image: p.photoUrl } : {}),
    description: p.headline || p.bio || undefined,
    jobTitle: p.jobTitle,
    address,
    ...geo,
    ...(knows.length > 0 ? { knowsAbout: knows } : {}),
    ...(business ? { worksFor: { "@id": business["@id"] } } : {}),
  };
  return business ? [person, business] : [person];
}

export type ClinicSchemaInput = {
  id: string;
  title: string;
  description: string | null;
  locationText: string;
  startDate: string;
  endDate: string | null;
  coach: { name: string; slug: string } | null;
};

// Clinics are dated, located, hosted — a clean fit for Event even without
// ticketing data. No `offers`/`performer` (there's no price or ticketing
// on EPA, and fabricating one just to chase the Events rich-result
// carousel isn't worth it) — Google still indexes the schema, it just
// won't be carousel-eligible without offers. `location` is a bare Place
// with the coach's own location_text as both name and address since
// clinics aren't geocoded (see CLAUDE.md — only providers resolve to
// lat/long today).
export function clinicEventSchema(clinic: ClinicSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: clinic.title,
    url: absoluteUrl(eventPath(clinic.id)),
    ...(clinic.description ? { description: clinic.description } : {}),
    startDate: clinic.startDate,
    ...(clinic.endDate ? { endDate: clinic.endDate } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: clinic.locationText,
      address: clinic.locationText,
    },
    ...(clinic.coach
      ? {
          organizer: {
            "@type": "Person",
            name: clinic.coach.name,
            url: absoluteUrl(profilePath(clinic.coach.slug)),
          },
        }
      : {}),
  };
}

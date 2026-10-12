"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { addLocation, removeLocation, type LocationState } from "./location-actions";

export type ExtraLocation = { id: string; suburb: string; state: string; travelRadiusKm: number };

const input =
  "w-full rounded-[12px] border border-border bg-bg px-3.5 py-[13px] text-[15px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none disabled:opacity-60";
const label = "mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle";

/**
 * Dashboard → Profile → Other locations: the extra bases a plan with more
 * than one location allows (location-actions.ts). Each has its own travel
 * distance. Extras over the plan's number are listed as dormant.
 */
export function OtherLocations({
  configured,
  locations,
  limit,
  upgradePlans,
  mainBase,
}: {
  configured: boolean;
  locations: ExtraLocation[];
  /** Bases the plan counts in all, main base included (1 to 3). */
  limit: number;
  /** Plan names that include more than one location, for the upsell line. */
  upgradePlans: string[];
  mainBase: string;
}) {
  const empty = { text: "", suburb: "", state: "", postcode: "" };
  const [place, setPlace] = useState(empty);
  // Clear the town once one has been added, ready for the next.
  const [state, action] = useActionState<LocationState, FormData>(async (prev, fd) => {
    const result = await addLocation(prev, fd);
    if (result?.ok) setPlace(empty);
    return result;
  }, null);
  const extrasAllowed = Math.max(0, limit - 1);
  const canAdd = extrasAllowed > 0 && locations.length < extrasAllowed;

  return (
    <section className="mt-6 rounded-[16px] border border-border bg-surface p-[18px] wide:p-6" id="locations" data-other-locations>
      <h2 className="text-[22px] leading-none text-ink wide:text-[24px]">Other locations</h2>
      <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.5] text-muted">
        {extrasAllowed > 0
          ? `If you work from more than one place, add it here. People searching near each place will find you, and each gets its own travel distance. Your plan covers ${limit} places in all, including ${mainBase || "your main base"}.`
          : "Working from more than one place? Some plans let you add up to two more locations, each with its own travel distance, so people near each one can find you."}
      </p>

      {locations.length > 0 && (
        <ul className="mt-3.5 flex flex-col gap-2">
          {locations.map((l, i) => {
            const dormant = i >= extrasAllowed;
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-shade px-3.5 py-3" data-location={l.id}>
                <div>
                  <p className="text-[15px] font-medium text-fg">
                    {l.suburb} {l.state}
                  </p>
                  <p className="mt-0.5 text-[13px] text-subtle">
                    Travels up to {l.travelRadiusKm} km{dormant ? " · Not showing on your current plan" : ""}
                  </p>
                </div>
                <form action={removeLocation.bind(null, l.id)}>
                  <Button type="submit" variant="danger-ghost" className="!text-[13px]" disabled={!configured}>
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {canAdd ? (
        <form action={action} className="mt-3.5 flex flex-col gap-2.5 wide:flex-row wide:items-end">
          <label className="block flex-[2]">
            <span className={label}>Another place you work from</span>
            <LocationAutocomplete
              value={place.text}
              onChange={(v) => setPlace({ text: v, suburb: "", state: "", postcode: "" })}
              onSelect={(s) => setPlace({ text: [s.suburb, s.state, s.postcode].filter(Boolean).join(" "), suburb: s.suburb, state: s.state, postcode: s.postcode })}
              placeholder="Suburb VIC 3550"
              disabled={!configured}
              inputClassName={input}
            />
            <input type="hidden" name="suburb" value={place.suburb} />
            <input type="hidden" name="state" value={place.state} />
            <input type="hidden" name="postcode" value={place.postcode} />
          </label>
          <label className="block flex-1">
            <span className={label}>Travels up to</span>
            <span className="relative block">
              <input name="travel_radius_km" type="number" min={0} max={1000} defaultValue={30} disabled={!configured} className={`${input} pr-12`} />
              <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-subtle">km</span>
            </span>
          </label>
          <Button type="submit" variant="secondary" disabled={!configured || !place.suburb} className="shrink-0">
            Add location
          </Button>
        </form>
      ) : (
        extrasAllowed === 0 && (
          <p className="mt-3 text-[13.5px] text-muted">
            {upgradePlans.length > 0 ? `${upgradePlans.join(" and ")} ${upgradePlans.length > 1 ? "include" : "includes"} up to three.` : ""}{" "}
            <Link href="/dashboard/billing" className="font-medium text-accent">
              Change plan
            </Link>
          </p>
        )
      )}
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`mt-2.5 text-[13.5px] ${state.ok ? "text-fg" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </section>
  );
}

"use client";

/**
 * Browser geolocation → the "Suburb STATE" text the search runs on. Shared
 * by the search card's "Use my location" button and anything else that
 * wants to start from where the rider is. Rejects with a message that is
 * safe to show as-is.
 */
export type Located = { value: string; suburb: string; state: string; postcode: string; lat: number; long: number };

export function canGeolocate() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function locateMe(): Promise<Located> {
  return new Promise((resolve, reject) => {
    if (!canGeolocate()) return reject(new Error("Location isn't available in this browser."));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: long } = pos.coords;
          const r = await fetch(`/api/reverse-locate?lat=${lat.toFixed(4)}&long=${long.toFixed(4)}`);
          if (!r.ok) {
            reject(new Error(r.status === 404 ? "We couldn't place you near an Australian suburb." : "Couldn't look up your location — try typing it."));
            return;
          }
          resolve((await r.json()) as Located);
        } catch {
          reject(new Error("Couldn't look up your location — try typing it."));
        }
      },
      (err) => {
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked for this site — allow it in your browser, or type a suburb."
              : "Couldn't get your location — try typing a suburb."
          )
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  });
}

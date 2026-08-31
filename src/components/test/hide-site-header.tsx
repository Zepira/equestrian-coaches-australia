"use client";

import { useEffect } from "react";

// TEST-ONLY helper — hides the real sticky SiteHeader so a hero mockup's own
// header design (the actual thing being compared) isn't stacked under it.
// Delete alongside src/app/test/ when done comparing.
export function HideSiteHeader() {
  useEffect(() => {
    const header = document.querySelector("header.sticky") as HTMLElement | null;
    if (!header) return;
    const prev = header.style.display;
    header.style.display = "none";
    return () => {
      header.style.display = prev;
    };
  }, []);
  return null;
}

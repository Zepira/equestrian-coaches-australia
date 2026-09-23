/**
 * Where an absolutely positioned panel can actually be seen.
 *
 * A dropdown normally decides whether to open up or down by comparing its
 * height against the space left in the viewport. That is wrong whenever an
 * ancestor clips: the hero is `overflow: hidden` (it has to be — .hero__media
 * insets -10% for the parallax and relies on the hero to crop it), so a panel
 * opening off the search card is cut at the hero's bottom edge long before it
 * reaches the bottom of the window, and a viewport-only check never sees it.
 *
 * Walks up from the trigger for the first ancestor that clips on either axis
 * — `overflow: hidden` clips both, and `overflow-x: auto` makes the block
 * axis `auto` too — and intersects it with the viewport.
 */
export function visibleBandFor(el: Element | null): { top: number; bottom: number } {
  let top = 0;
  let bottom = typeof window === "undefined" ? 0 : window.innerHeight;
  let node = el?.parentElement ?? null;

  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    if (cs.overflow !== "visible" || cs.overflowY !== "visible") {
      const r = node.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    node = node.parentElement;
  }
  return { top, bottom };
}

/**
 * Given a trigger and a panel's preferred height, decide which way it opens
 * and how tall it may be. Prefers down; flips only when down genuinely can't
 * fit and up has more room. `maxHeight` is what's actually available on the
 * chosen side, so the panel scrolls rather than being cut off.
 */
export function placePanel(
  trigger: Element | null,
  preferredHeight: number,
  gap = 6
): { dropUp: boolean; maxHeight: number } {
  const rect = trigger?.getBoundingClientRect();
  if (!rect) return { dropUp: false, maxHeight: preferredHeight };

  const band = visibleBandFor(trigger);
  const below = band.bottom - rect.bottom - gap;
  const above = rect.top - band.top - gap;
  const dropUp = below < preferredHeight && above > below;
  // Never collapse to a sliver — below this a scrolling panel is unusable
  // and it's better to overflow the band than to show two rows.
  const maxHeight = Math.max(180, Math.min(preferredHeight, dropUp ? above : below));
  return { dropUp, maxHeight };
}

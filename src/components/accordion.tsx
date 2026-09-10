"use client";

import { useId, useState } from "react";

export type AccordionItem = {
  q: string;
  a: string;
};

/**
 * FAQ accordion (canvas: For Coaches › Questions). Question in Instrument
 * Serif (20px / 26px) with a small round +/− control in terracotta; one
 * panel open at a time, the first open by default. Native buttons with
 * aria-expanded / aria-controls; no animation library.
 */
export function Accordion({ items, defaultOpen = 0 }: { items: AccordionItem[]; defaultOpen?: number | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className="flex flex-col border-t border-border">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div key={item.q} className="border-b border-border">
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-3.5 py-[18px] text-left font-display text-[20px] leading-[1.2] text-ink wide:gap-5 wide:py-[22px] wide:text-[26px] wide:leading-[1.15]"
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-sans text-[16px] text-accent wide:h-[34px] wide:w-[34px] wide:text-[18px]"
                >
                  {open ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-5 pr-10 text-[15px] leading-[1.55] text-muted wide:max-w-[64ch] wide:pb-6 wide:pr-[60px] wide:text-[16px] wide:leading-[1.6]">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

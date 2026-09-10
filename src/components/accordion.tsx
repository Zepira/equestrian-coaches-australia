"use client";

import { useId, useState } from "react";

export type AccordionItem = {
  q: string;
  a: string;
};

// Plain, keyboard-accessible accordion — native <button> triggers with
// aria-expanded/aria-controls, one open panel per item. No animation
// library: height auto via grid-template-rows trick keeps it dependency-free
// and respects prefers-reduced-motion for free (a discrete transition).
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="divide-y divide-border border-t border-b border-border">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg text-fg"
              >
                {item.q}
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-2xl leading-none text-accent transition-transform ${open ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="pb-5 pr-10 text-[15px] leading-relaxed text-muted"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

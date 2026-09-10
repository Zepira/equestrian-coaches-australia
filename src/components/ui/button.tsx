import Link from "next/link";
import { ComponentProps } from "react";

/**
 * Buttons from the Golden Hour canvases.
 *
 * variant
 *   primary        terracotta fill, cream text, hover #9c4630 (the CTA)
 *   ink            hunter-green fill, cream text, hover terracotta
 *   cream          cream fill, ink text, hover terracotta fill (CTA on ink)
 *   secondary      ink hairline outline, ink text (was "secondary" before)
 *   outline-light  cream hairline outline, cream text, hover fills cream
 *   ghost          underlined text link, terracotta (or peach on dark)
 *   danger-ghost   underlined text link, danger colour
 *
 * shape
 *   pill   999px — header CTA, profile buttons, dashboard, most places
 *   soft   10px  — buttons that sit inside a search card or a hero stack
 */
type Variant = "primary" | "ink" | "cream" | "secondary" | "outline-light" | "ghost" | "danger-ghost";
type Shape = "pill" | "soft";

const base =
  "inline-flex items-center justify-center gap-2 text-[16px] font-semibold px-6 py-[15px] leading-none transition-colors duration-[250ms] disabled:opacity-50 disabled:pointer-events-none";

const shapes: Record<Shape, string> = {
  pill: "rounded-[var(--radius-pill)]",
  soft: "rounded-[var(--radius-soft)]",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  ink: "bg-ink text-ink-fg hover:bg-accent",
  cream: "bg-bg text-ink hover:bg-accent hover:text-accent-fg",
  secondary: "border border-ink text-ink font-medium py-[14px] hover:bg-shade",
  "outline-light": "border border-ink-fg/40 text-ink-fg font-medium py-[14px] hover:bg-ink-fg hover:text-ink",
  ghost:
    "px-0 py-0 rounded-none font-medium text-[15px] text-accent border-b border-current hover:text-ink",
  "danger-ghost": "px-0 py-0 rounded-none font-medium text-[15px] text-danger border-b border-current hover:opacity-80",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; shape?: Shape };

export function Button({ variant = "primary", shape = "pill", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${shapes[shape]} ${variants[variant]} ${className}`} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; shape?: Shape };

export function LinkButton({ variant = "primary", shape = "pill", className = "", ...props }: LinkButtonProps) {
  return <Link className={`${base} ${shapes[shape]} ${variants[variant]} ${className}`} {...props} />;
}

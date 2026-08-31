import Link from "next/link";
import { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "brass" | "ghost" | "danger-ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] text-[15px] font-semibold px-6 py-3 transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-ink text-ink hover:bg-shade",
  brass: "bg-brass text-brass-fg hover:opacity-90",
  ghost: "px-0 py-0 font-semibold text-accent border-b border-accent rounded-none hover:text-ink hover:border-ink",
  "danger-ghost": "px-0 py-0 font-semibold text-danger rounded-none hover:opacity-80",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function LinkButton({ variant = "primary", className = "", ...props }: LinkButtonProps) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

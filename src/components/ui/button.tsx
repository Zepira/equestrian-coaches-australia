import Link from "next/link";
import { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-[15px] font-semibold px-5 py-3 transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-border bg-surface text-fg hover:bg-accent-soft",
  ghost: "text-fg hover:bg-accent-soft",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function LinkButton({ variant = "primary", className = "", ...props }: LinkButtonProps) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

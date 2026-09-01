import { usePathname } from "next/navigation";
import { useScrolled } from "@/hooks/use-scrolled";

export type HeaderAppearance = {
  /** Header sits on a full-bleed dark hero (currently: the homepage only). */
  overlay: boolean;
  /** Nothing behind the header yet — no solid background, light text. */
  transparent: boolean;
  positionClassName: string;
  colorClassName: string;
  wordmarkClassName: string;
  iconClassName: string;
  linkClassName: string;
};

/**
 * Decides how the site header should look on the current page: solid and
 * sticky everywhere except the homepage, where it starts transparent over
 * the hero photo and eases into a solid ink bar once the page scrolls (or
 * the mobile menu opens, so the panel always has a legible bar to sit
 * under).
 */
export function useHeaderAppearance(mobileMenuOpen: boolean): HeaderAppearance {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const scrolled = useScrolled(overlay);
  const transparent = overlay && !mobileMenuOpen && !scrolled;

  return {
    overlay,
    transparent,
    positionClassName: overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
    colorClassName: transparent
      ? "border-ink-fg/20 bg-transparent"
      : overlay
        ? "border-ink-fg/10 bg-ink/95 backdrop-blur"
        : "border-border bg-bg/95 backdrop-blur",
    wordmarkClassName: overlay ? "text-ink-fg" : "text-ink",
    iconClassName: overlay ? "text-ink-fg" : "text-fg",
    linkClassName: transparent
      ? "text-[15px] font-medium text-ink-fg hover:text-ink-fg/75"
      : "text-[15px] font-medium text-fg hover:text-accent",
  };
}

import type { Metadata, Viewport } from "next";
import { CoachesHome } from "@/components/coaches-home";

// Same dark top edge as "/" — both render the coaches hero.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14281f",
};

export const metadata: Metadata = {
  title: "Riding coaches",
  description:
    "Riding coaches across Australia, searchable by discipline and location. Free for riders, always.",
};

export default function CoachesIndex() {
  return <CoachesHome />;
}

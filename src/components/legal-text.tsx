import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Links inside legal copy, safe for client components: `[label](/path)` (or
 * `#anchor`), and in the legal pages the site's own legal paths and
 * oaic.gov.au written out bare. Nothing else is interpreted.
 */
const TOKEN = /(\[[^\]]+\]\((?:\/[a-z0-9/-]*|#[a-z0-9-]+)\)|\/(?:terms|privacy|cookies|refunds|review-policy|how-we-list)\b|oaic\.gov\.au)/;

export function LegalText({ text, linkClassName = "border-b border-current text-accent" }: { text: string; linkClassName?: string }): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const md = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (md) {
      return md[2].startsWith("#") ? (
        <a key={i} href={md[2]} className={linkClassName}>
          {md[1]}
        </a>
      ) : (
        <Link key={i} href={md[2]} className={linkClassName}>
          {md[1]}
        </Link>
      );
    }
    return part.startsWith("/") ? (
      <Link key={i} href={part} className={linkClassName}>
        {part}
      </Link>
    ) : (
      <a key={i} href={`https://www.${part}`} className={linkClassName} rel="noopener">
        {part}
      </a>
    );
  });
}

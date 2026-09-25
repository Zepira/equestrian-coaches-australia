import { Fragment, type ReactNode } from "react";
import Link from "next/link";

/**
 * The guides' Markdown (M9), deliberately small: ## and ### headings,
 * paragraphs, - and 1. lists, > quotes, **bold**, *italic* and
 * [links](https://… or /path). It builds React elements, never HTML, so
 * nothing typed in admin can put a script on the page. Anything it doesn't
 * know shows as the text it is.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) {
      const href = m[2];
      if (href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={k} href={href} className="font-medium text-accent underline-offset-2 hover:underline">{m[1]}</Link>);
      else if (/^https?:\/\//.test(href)) out.push(<a key={k} href={href} rel="noopener nofollow" className="font-medium text-accent underline-offset-2 hover:underline">{m[1]}</a>);
      else out.push(m[0]);
    } else if (m[3] !== undefined) out.push(<strong key={k} className="font-semibold text-fg">{m[3]}</strong>);
    else out.push(<em key={k}>{m[4]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${n++}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      blocks.push(
        h[1] === "##" ? (
          <h2 key={key} className="mt-10 text-[30px] leading-[1.1] text-ink wide:text-[34px]">{inline(h[2], key)}</h2>
        ) : (
          <h3 key={key} className="mt-7 text-[23px] leading-[1.15] text-ink wide:text-[25px]">{inline(h[2], key)}</h3>
        )
      );
      i++;
      continue;
    }
    const listRe = /^(\s*)([-*]|\d+\.)\s+(.+)$/;
    if (listRe.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && listRe.test(lines[i])) items.push(listRe.exec(lines[i++])![3]);
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={key} className={`mt-4 flex flex-col gap-2 pl-6 text-[17px] leading-[1.6] text-fg ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
        </Tag>
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key} className="mt-5 border-l-2 border-accent pl-4 font-display text-[21px] leading-[1.35] text-ink">
          {inline(quote.join(" "), key)}
        </blockquote>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^#{2,3}\s/.test(lines[i]) && !listRe.test(lines[i]) && !lines[i].startsWith(">")) para.push(lines[i++]);
    blocks.push(
      <p key={key} className="mt-4 text-[17px] leading-[1.65] text-fg">
        {para.map((p, j) => <Fragment key={j}>{j > 0 && " "}{inline(p, `${key}-${j}`)}</Fragment>)}
      </p>
    );
  }
  return <>{blocks}</>;
}

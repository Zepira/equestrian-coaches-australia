import { Fragment } from "react";

/**
 * Page copy from content_blocks is plain text with one piece of markup:
 * `**words**` is set in bold. Nothing else is interpreted, so an admin can't
 * put HTML on the page.
 */
export function RichText({ text, strongClassName = "font-semibold text-fg" }: { text: string; strongClassName?: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={strongClassName}>
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

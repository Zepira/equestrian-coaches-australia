import { Fragment } from "react";

/**
 * Page copy from content_blocks is plain text with two pieces of markup:
 * `**words**` is set in bold and `*words*` in italic (the accent italic the
 * headings use). Nothing else is interpreted, so an admin can't put HTML on
 * the page.
 */
export function RichText({
  text,
  strongClassName = "font-semibold text-fg",
  emClassName,
}: {
  text: string;
  strongClassName?: string;
  emClassName?: string;
}) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={strongClassName}>
            {part}
          </strong>
        ) : (
          <Fragment key={i}>
            {part.split("*").map((bit, j) =>
              j % 2 === 1 ? (
                <em key={j} className={emClassName}>
                  {bit}
                </em>
              ) : (
                <Fragment key={j}>{bit}</Fragment>
              )
            )}
          </Fragment>
        )
      )}
    </>
  );
}

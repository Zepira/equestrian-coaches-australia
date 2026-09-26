import { PUBLIC_HOST } from "@/lib/launch";
import { SITE_URL } from "@/lib/site-url";

/**
 * One HTML layout for every email the site sends.
 *
 * The words stay where they were: each email is a content block, filled by
 * fillVariables and handed to sendEmail as plain text. This turns that same
 * text into the HTML part, so there is one design to maintain rather than one
 * template per email, and nothing about how copy is edited changes.
 *
 * HTML email is not the web. Tables rather than flex, inline styles on every
 * element, a fixed 600px column, and no web fonts (Outlook ignores them, so
 * the display face falls back to Georgia). The plain text part is always sent
 * alongside this, which is what people with images off or a text-only client
 * actually read.
 */

/**
 * Absolute URL for an image in an email.
 *
 * Deliberately not SITE_URL: before launch that is the test host, which sits
 * behind a password, so every image in every email would come back 401 and
 * render as a broken icon. The public host serves /brand/ even before launch
 * (isPreLaunchPath in src/proxy.ts).
 */
function assetUrl(path: string): string {
  const base = PUBLIC_HOST ? `https://${PUBLIC_HOST}` : SITE_URL;
  return `${base}${path}`;
}

const C = {
  ground: "#f6f1e7",
  surface: "#fffdf8",
  ink: "#14281f",
  inkFg: "#f6f1e7",
  text: "#22201c",
  muted: "#4a4842",
  subtle: "#6c685e",
  border: "#e7dac6",
  accent: "#b4553a",
  peach: "#e8b79a",
} as const;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Turns bare URLs into links. The text bodies carry raw URLs (an unsubscribe
 * link, a dashboard link), and an unlinked address in an HTML part reads as
 * broken. Runs after escaping, so the pattern only ever sees escaped text.
 */
function linkify(escaped: string): string {
  return escaped.replace(/https?:\/\/[^\s<]+[^\s<.,)]/g, (url) => {
    // A tokenised link runs to 90-odd characters, which wraps over three lines
    // in a 600px column and reads like spam. The label drops the scheme and the
    // query while the href keeps every character of it, so the link still says
    // where it goes: same host, same path.
    let label = url.replace(/^https?:\/\//, "");
    if (label.length > 48) label = `${label.split("?")[0]}`;
    if (label.length > 48) label = `${label.slice(0, 45)}...`;
    return `<a href="${url}" style="color:${C.accent};text-decoration:underline;word-break:break-word;">${label}</a>`;
  });
}

/** Blank line starts a paragraph; a single newline is a line break inside one. */
function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const P_STYLE = `margin:0 0 16px;font-size:16px;line-height:1.55;color:${C.text};`;
const SMALL_STYLE = `margin:0 0 10px;font-size:13px;line-height:1.5;color:${C.subtle};`;

/**
 * The whole email. `text` is exactly what the plain text part carries, footer
 * included, so the two never say different things.
 */
export function renderEmailHtml(text: string, subject: string): string {
  const blocks = paragraphs(text);

  // sendEmail appends the commercial footer after a "--" line (the usual
  // signature separator), joined to it by a single newline, so the separator
  // and the footer arrive as one block rather than two. Everything from there
  // down is set smaller and quieter, and the "--" itself is dropped: it is a
  // convention for plain text readers, not something to print.
  const cut = blocks.findIndex((b) => b === "--" || b.startsWith("--\n"));
  const body = cut === -1 ? blocks : blocks.slice(0, cut);
  const footer =
    cut === -1
      ? []
      : [blocks[cut].replace(/^--\n?/, ""), ...blocks.slice(cut + 1)].filter(Boolean);

  const render = (list: string[], style: string) =>
    list
      .map((p) => `<p style="${style}">${linkify(escapeHtml(p)).replace(/\n/g, "<br />")}</p>`)
      .join("");

  // Shown by most inboxes as the preview line beside the subject. Hidden in
  // the message itself, and padded so the client does not pull body text in
  // after it.
  const preheader = escapeHtml(body[0]?.slice(0, 140) ?? "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.ground};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.surface};border:1px solid ${C.border};border-radius:18px;overflow:hidden;">

<tr><td style="background-color:${C.ink};padding:22px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle;">
<img src="${assetUrl("/brand/horse-cream-small.png")}" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;" />
</td>
<td style="vertical-align:middle;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.1;color:${C.inkFg};">Equine Professionals</div>
<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:${C.peach};padding-top:3px;">Australia</div>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:28px;font-family:Helvetica,Arial,sans-serif;">
${render(body, P_STYLE)}
</td></tr>

${
  footer.length
    ? `<tr><td style="padding:0 28px;"><div style="height:1px;background-color:${C.border};"></div></td></tr>
<tr><td style="padding:18px 28px 24px;font-family:Helvetica,Arial,sans-serif;">${render(footer, SMALL_STYLE)}</td></tr>`
    : ""
}

</table>
</td></tr>
</table>
</body>
</html>`;
}

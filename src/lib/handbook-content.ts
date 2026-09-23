import fs from "node:fs/promises";
import path from "node:path";
import type { HandbookDoc } from "./handbook";

/**
 * The server-only half of the handbook: reading a document off disk and wrapping
 * it into a complete page for the iframe.
 *
 * Kept apart from `handbook.ts` on purpose. The manifest is the thing a client
 * component might one day want to import, and a single value import from a
 * "use client" file would drag `node:fs/promises` into the browser bundle and
 * fail the build. Nothing in here is importable from the client.
 */

const HANDBOOK_DIR = path.join(process.cwd(), "content", "handbook");

/**
 * `file` always comes from the manifest, never from the URL, so there is no path
 * to traverse. The basename call is belt and braces.
 */
function resolveDocPath(doc: HandbookDoc) {
  return path.join(HANDBOOK_DIR, path.basename(doc.file));
}

export async function readHandbookDoc(doc: HandbookDoc): Promise<string> {
  return fs.readFile(resolveDocPath(doc), "utf8");
}

/**
 * The script injected into every document. Two jobs:
 *
 *   1. Report height to the parent, so the iframe can grow to fit and the outer
 *      page scrolls normally. Height is measured from a zero-height probe at the
 *      end of <body> rather than from `documentElement.scrollHeight`, because
 *      scrollHeight on the root element returns the greater of the content and
 *      the *viewport* — and the viewport is whatever height the parent last set.
 *      That makes it a ratchet: it can never report a smaller number than the
 *      frame already is, so a document that reflows shorter leaves a growing
 *      band of blank space underneath it.
 *
 *   2. Answer the parent's ready ping. The parent's message listener only
 *      attaches once React has hydrated; on a warm cache this document can
 *      finish first and fire all its height messages into the void. The ping
 *      lets a late listener ask again.
 *
 * Links are handled here too. An in-page anchor should stay inside the frame;
 * anything off-site should open in a new tab rather than replacing the admin
 * panel, which is what a blanket <base target="_top"> would do to `href="#"`.
 */
const FRAME_SCRIPT = `
(function () {
  var probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "height:0;margin:0;padding:0;border:0;clear:both";
  document.body.appendChild(probe);

  function measure() {
    var bottom = probe.getBoundingClientRect().bottom + window.scrollY;
    var pad = parseFloat(getComputedStyle(document.body).marginBottom) || 0;
    return Math.max(0, Math.ceil(bottom + pad));
  }

  function send() {
    parent.postMessage(
      { source: "eca-handbook", height: measure() },
      window.location.origin
    );
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data;
    if (data && data.source === "eca-handbook-parent") send();
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(send).observe(document.body);
  }
  window.addEventListener("load", send);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(send);

  Array.prototype.forEach.call(document.links, function (a) {
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" || href === "") return;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  send();
})();
`;

/**
 * Wraps a document fragment into a complete page for the iframe.
 *
 * The source files are artifact fragments: a <title>, the Google Fonts links, a
 * <style> block, then the content. Everything up to and including the first
 * </style> becomes the head; the rest becomes the body. Splitting on the first
 * rather than the last occurrence matters: a document that grows a second inline
 * <style> would otherwise dump all the markup before it into <head>, where the
 * browser recovers silently and unpredictably.
 *
 * A document with no <style> at all still works — it simply all becomes body.
 */
export function buildHandbookFrameHtml(html: string): string {
  const marker = "</style>";
  const cut = html.indexOf(marker);
  const head = cut === -1 ? "" : html.slice(0, cut + marker.length);
  const body = cut === -1 ? html : html.slice(cut + marker.length);

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${head}
<style>html,body{height:auto;min-height:0}</style>
</head>
<body>
${body}
<script>${FRAME_SCRIPT}</script>
</body>
</html>`;
}

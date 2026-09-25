"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// An inline script that runs before first paint, rendered only where it can
// run: in the server HTML, and while hydrating that HTML. A script React
// creates on the client never executes, and React logs "Encountered a script
// tag while rendering React component" when it does. That happens whenever
// the root layout renders without server markup, which is every notFound()
// thrown by a dynamic route: Next sends the `__next_error__` shell and the
// client builds the whole tree, layout included. (next/script's
// beforeInteractive has the same problem in the App Router: it returns a raw
// <script> element on the client too.)
//
// useSyncExternalStore's server snapshot is what hydration uses, so the
// element matches the server HTML; the client snapshot is false, so a fresh
// client render (and the re-render after hydration) renders nothing. The
// script has already run by then; SiteHeader's effect keeps the attributes
// right from there on.
export function BootScript({ id, code }: { id: string; code: string }) {
  const serverOrHydrating = useSyncExternalStore(noop, () => false, () => true);
  if (!serverOrHydrating) return null;
  return <script id={id} dangerouslySetInnerHTML={{ __html: code }} />;
}

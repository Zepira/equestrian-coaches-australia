"use client";

import { ErrorView } from "@/components/error-view";

/** Any page that breaks while it loads. The header and footer stay. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorView
      error={error}
      retry={retry}
      title="This page didn't load."
      lead="It's not you. Something went wrong on our side, and we've been told about it. Try again in a moment, or head back to the home page."
    />
  );
}

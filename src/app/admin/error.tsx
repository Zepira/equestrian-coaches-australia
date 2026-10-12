"use client";

import { ErrorView } from "@/components/error-view";

/** An admin screen that breaks. The rail stays; the error is in Sentry with its reference. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorView
      error={error}
      retry={retry}
      title="This screen didn't load."
      lead="It's been reported to Sentry. Try again, or use another screen from the menu. The reference below matches the report."
      home={{ href: "/admin", label: "Back to the admin overview" }}
    />
  );
}

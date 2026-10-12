"use client";

import { ErrorView } from "@/components/error-view";

/** A dashboard page that breaks. The dashboard's own menu stays, so the rest of it is one click away. */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorView
      error={error}
      retry={retry}
      title="That part of your dashboard didn't load."
      lead="Nothing you've saved is lost. Something went wrong on our side and we've been told about it. Try again, or pick another tab."
      home={{ href: "/dashboard", label: "Back to the overview" }}
    />
  );
}

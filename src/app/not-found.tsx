import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="text-sm font-semibold uppercase tracking-wide text-accent">404</div>
      <h1 className="mt-3 text-3xl font-bold text-fg">Page not found</h1>
      <p className="mt-3 text-muted">
        That page doesn&apos;t exist — it may have moved, or the coach/clinic you&apos;re looking
        for is no longer listed.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/">Back to home</LinkButton>
        <LinkButton href="/search" variant="secondary">
          Find a coach
        </LinkButton>
      </div>
    </div>
  );
}

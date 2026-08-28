import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-fg">Log in</h1>

      {/* Form is UI-only until Supabase Auth is wired up (build plan, phase 2) */}
      <form className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Email</span>
          <input
            type="email"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Password</span>
          <input
            type="password"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>
        <Button type="submit" className="mt-2 w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role = "rider" } = await searchParams;
  const isCoach = role === "coach";

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-fg">
        {isCoach ? "List your coaching profile" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isCoach
          ? "Sign up to build your profile — you'll choose a plan next."
          : "Save favourite coaches and get notified about clinics near you."}
      </p>

      {/* Form is UI-only until Supabase Auth is wired up (build plan, phase 2) */}
      <form className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">Name</span>
          <input
            type="text"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-fg"
            required
          />
        </label>
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
          {isCoach ? "Continue to plan selection" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}

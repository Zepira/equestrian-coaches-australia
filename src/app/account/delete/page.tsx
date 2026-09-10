import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "../actions";

export const metadata = { title: "Delete my account", robots: { index: false, follow: false } };

/**
 * Confirmation step for the rider account's one destructive action. The
 * word DELETE has to be typed; the server action checks it again.
 */
export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/login?next=/account/delete");

  return (
    <div className="mx-auto max-w-[520px] px-[18px] py-6 wide:px-12 wide:py-11">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">My account</p>
      <h1 className="mt-1.5 font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-2 wide:text-[56px] wide:leading-[0.98] wide:-tracking-[0.025em]">Delete my account</h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">
        This removes your login, saved coaches and clinic alerts straight away. Enquiries you have already sent stay with the coach so they can still reply to you by email or phone.
      </p>
      <form action={deleteAccount} className="mt-6 rounded-[16px] border border-border bg-surface p-4 wide:p-6">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-subtle">Type DELETE to confirm</span>
          <input
            name="confirm"
            autoComplete="off"
            required
            className="w-full rounded-[12px] border border-border bg-white px-3.5 h-12 text-[15px] text-fg focus:border-accent focus:outline-none"
          />
        </label>
        {error === "confirm" && (
          <p role="alert" className="mt-2 text-[13px] text-accent">
            Type DELETE exactly to confirm.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2.5 wide:flex-row-reverse wide:justify-start">
          <button type="submit" className="h-12 rounded-[var(--radius-pill)] bg-accent px-5 text-[15px] font-semibold text-accent-fg transition-colors duration-200 hover:bg-accent-hover">
            Delete my account
          </button>
          <Link href="/account" className="flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-border px-5 text-[15px] font-medium text-muted">
            Keep my account
          </Link>
        </div>
      </form>
    </div>
  );
}

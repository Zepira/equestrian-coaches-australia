"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toggleFavourite } from "@/app/coaches/actions";

/**
 * Save-to-favourites (canvas: Coach Profile). Two shapes: `icon` — the 40px
 * round translucent heart in the phone header over the photo (♡, peach ♥
 * when saved); `pill` — "Save to favourites" / "Saved" on desktop. A
 * logged-out click goes to /login with a return path. `coachId` null (a
 * mock or placeholder coach) renders the control disabled.
 */
export function FavouriteButton({
  coachId,
  coachSlug,
  shape = "pill",
  className = "",
}: {
  coachId: string | null;
  coachSlug: string;
  shape?: "icon" | "pill";
  className?: string;
}) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(isSupabaseConfigured ? null : false);
  const [favourited, setFavourited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !coachId) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setLoggedIn(Boolean(user));
      if (!user) return;
      const { data } = await supabase
        .from("favourites")
        .select("coach_id")
        .eq("rider_id", user.id)
        .eq("coach_id", coachId)
        .maybeSingle();
      setFavourited(Boolean(data));
    });
  }, [coachId]);

  function handleClick() {
    if (!coachId) return;
    if (!loggedIn) {
      router.push(`/login?next=/coaches/${coachSlug}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await toggleFavourite(coachId);
        setFavourited(result.favourited);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update favourites — try again.");
      }
    });
  }

  const disabled = !coachId || (coachId != null && loggedIn === null) || pending;
  const label = favourited ? "Saved" : "Save to favourites";

  if (shape === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={favourited}
        aria-label={label}
        title={error ?? label}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-ink-deep/55 text-[18px] backdrop-blur-[6px] transition-colors duration-200 disabled:opacity-60 ${favourited ? "text-peach" : "text-ink-fg"} ${className}`}
      >
        {favourited ? "♥" : "♡"}
      </button>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={favourited}
        className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2.5 text-[14px] font-medium transition-colors duration-200 disabled:opacity-60 ${favourited ? "text-accent" : "text-ink"}`}
      >
        <span className="text-[16px]" aria-hidden>
          {favourited ? "♥" : "♡"}
        </span>
        {label}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

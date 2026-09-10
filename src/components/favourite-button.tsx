"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toggleFavourite } from "@/app/coaches/actions";
import { Button } from "@/components/ui/button";

export function FavouriteButton({ coachId, coachSlug }: { coachId: string; coachSlug: string }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(isSupabaseConfigured ? null : false);
  const [favourited, setFavourited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

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
    if (!loggedIn) {
      router.push(`/login?next=/coaches/${coachSlug}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      // toggleFavourite throws on any failure (RLS denial, stale session,
      // network) rather than returning an error field — without this
      // catch, that rejection just vanished inside startTransition with no
      // feedback: the button sat there looking clicked but nothing
      // happened, same silent-failure shape as the login/signup bug fixed
      // earlier this session.
      try {
        const result = await toggleFavourite(coachId);
        setFavourited(result.favourited);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update favourites — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={loggedIn === null || pending}
        className="shrink-0"
      >
        {favourited ? "♥ Favourited" : "♡ Favourite"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

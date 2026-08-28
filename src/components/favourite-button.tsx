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
    startTransition(async () => {
      const result = await toggleFavourite(coachId);
      setFavourited(result.favourited);
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={loggedIn === null || pending}
      className="shrink-0"
    >
      {favourited ? "♥ Favourited" : "♡ Favourite"}
    </Button>
  );
}

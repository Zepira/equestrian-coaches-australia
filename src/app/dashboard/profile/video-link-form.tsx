"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { saveVideoLink, type VideoLinkState } from "./actions";

/**
 * The intro video: a YouTube or Vimeo link (src/lib/video-embed.ts), not an
 * upload. Upload it to either service first; an unlisted video works too.
 */
export function VideoLinkForm({ configured, current }: { configured: boolean; current: string | null }) {
  const [state, action, pending] = useActionState<VideoLinkState, FormData>(saveVideoLink, null);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-2">
      <label htmlFor="video-url" className="text-[13px] text-muted">
        Paste the link to your video on YouTube or Vimeo. An unlisted video works, so it doesn&apos;t have to show on your channel.
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="video-url"
          name="video_url"
          type="url"
          inputMode="url"
          required
          defaultValue={current ?? ""}
          placeholder="https://youtu.be/…"
          disabled={!configured || pending}
          className={inputClass}
        />
        <Button type="submit" variant="secondary" disabled={!configured || pending} className="shrink-0">
          {pending ? "Saving…" : current ? "Change link" : "Add video"}
        </Button>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-[13px] ${state.ok ? "text-fg" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

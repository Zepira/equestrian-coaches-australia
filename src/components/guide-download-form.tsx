"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestDownload, type DownloadResult } from "@/app/guides/actions";

/** "Get the calendar by email" on a guide (M9). */
export function GuideDownloadForm({ guideId, heading, lead }: { guideId: string; heading: string; lead: string }) {
  const [state, action, pending] = useActionState<DownloadResult, FormData>(requestDownload, { ok: false, message: "" });
  return (
    <section className="mt-10 rounded-[18px] border border-border bg-surface p-5 wide:p-6" data-guide-download>
      <h2 className="text-[24px] leading-[1.1] text-ink">{heading}</h2>
      {state.ok ? (
        <p role="status" className="mt-3 text-[15px] text-fg">{state.message}</p>
      ) : (
        <>
          <p className="mt-2 text-[14.5px] text-muted">{lead}</p>
          <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="guide_id" value={guideId} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
            <input name="email" type="email" required autoComplete="email" placeholder="Your email" aria-label="Your email" className="h-11 w-full rounded-[10px] border border-border bg-white px-3.5 text-[15px] text-fg focus:border-accent focus:outline-none" />
            <Button type="submit" disabled={pending} className="h-11 shrink-0">{pending ? "Sending" : "Send it"}</Button>
          </form>
          {state.message && <p role="alert" className="mt-2 text-[14px] text-danger">{state.message}</p>}
        </>
      )}
    </section>
  );
}

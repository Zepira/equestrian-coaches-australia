"use client";

import { startTransition, useActionState, useState } from "react";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/compress-image";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { enterCompetition, type EntryResult } from "@/app/competitions/actions";

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

/** The entry form (M10): the question, who's entering, and the separate unticked news box. */
export function CompetitionEntryForm({
  competitionId,
  question,
  ageLabel,
  parentLabel,
  sent,
  news,
  photo = "none",
}: {
  /** Whether entries include a photo: none, optional or required (M10). */
  photo?: "none" | "optional" | "required";
  competitionId: string;
  question: string;
  ageLabel: string;
  parentLabel: string;
  sent: string;
  news: { id: string; body: string } | null;
}) {
  const [state, action, pending] = useActionState<EntryResult, FormData>(enterCompetition, { ok: false, message: "" });
  const [age, setAge] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [preparing, setPreparing] = useState(false);
  // The photo is shrunk to 1600px before it goes, so a phone's 8MB original
  // fits in a form post; everything else is sent as typed.
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (photo === "none") return;
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("photo");
    setPhotoError("");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SOURCE_BYTES) return setPhotoError("That file's too large. Choose a photo under 25MB.");
      setPreparing(true);
      fd.set("photo", await compressImage(file, 1600));
      setPreparing(false);
    } else fd.delete("photo");
    startTransition(() => action(fd));
  };
  if (state.ok && state.sent) return <p role="status" className="text-[15px] leading-[1.5] text-fg" data-entry-sent>{sent}</p>;
  return (
    <form action={action} onSubmit={submit} className="flex flex-col gap-4" data-entry-form>
      <input type="hidden" name="competition_id" value={competitionId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-px w-px" />
      <Field label={question}>
        <textarea name="answer" required maxLength={2000} rows={5} className={inputClass} />
      </Field>
      {photo !== "none" && (
        <Field label={photo === "required" ? "Your photo" : "A photo (optional)"}>
          <input name="photo" type="file" accept="image/*" required={photo === "required"} className={inputClass} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Your name"><input name="name" required maxLength={80} autoComplete="name" className={inputClass} /></Field>
        <Field label="State">
          <select name="state" defaultValue="" className={inputClass}>
            <option value="">Choose</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Your email"><input name="email" type="email" required autoComplete="email" className={inputClass} /></Field>
      <fieldset className="flex flex-col gap-2 text-[14px] text-fg">
        <label className="flex items-start gap-2.5"><input type="radio" name="age" value="adult" required checked={age === "adult"} onChange={() => setAge("adult")} className="mt-1 accent-accent" />{ageLabel}</label>
        <label className="flex items-start gap-2.5"><input type="radio" name="age" value="parent" checked={age === "parent"} onChange={() => setAge("parent")} className="mt-1 accent-accent" />{parentLabel}</label>
      </fieldset>
      {age === "parent" && <Field label="Parent or guardian's name"><input name="parent_name" required maxLength={80} className={inputClass} /></Field>}
      {news && (
        <label className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-fg">
          <input type="checkbox" name="news" className="mt-1 accent-accent" />
          <input type="hidden" name="news_wording" value={news.id} />
          <span>{news.body}</span>
        </label>
      )}
      {(photoError || state.message) && <p role="alert" className="text-[14px] text-danger">{photoError || state.message}</p>}
      <Button type="submit" disabled={pending || preparing} className="h-12 w-full text-[15px]">{pending || preparing ? "Sending" : "Enter"}</Button>
    </form>
  );
}

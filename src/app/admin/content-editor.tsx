"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * One form for a set of content blocks (Pages, Emails). The fields come from
 * each block's default: text is a box, a list of text is one box per item
 * (or one per line for headline words), numbers are comma-separated, and a
 * list of heading-and-text items gets add, remove and move buttons. The
 * whole draft goes to the server as JSON, which checks every block against
 * its default's shape before saving, the same check the pages run on read.
 */

type Json = string | number | Json[] | { [k: string]: Json };
export type EditorBlock = { key: string; name: string; value: Json; def: Json };
export type SaveResult = { ok: boolean; message: string } | null;

const LINE_LISTS = new Set(["words", "cycle"]);
const human = (k: string) => {
  const s = k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const input = "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[15px] text-fg";
const isItems = (def: Json) => Array.isArray(def) && typeof def[0] === "object" && def[0] !== null && !Array.isArray(def[0]);

export function ContentEditor({
  blocks,
  hints,
  action,
  testAction,
  saveLabel = "Save",
}: {
  blocks: EditorBlock[];
  hints: Record<string, string>;
  action: (prev: SaveResult, fd: FormData) => Promise<SaveResult>;
  testAction?: (prev: SaveResult, fd: FormData) => Promise<SaveResult>;
  saveLabel?: string;
}) {
  const [draft, setDraft] = useState<Record<string, Json>>(() => Object.fromEntries(blocks.map((b) => [b.key, b.value])));
  const [state, formAction, pending] = useActionState(action, null);
  const [testState, testFormAction, testPending] = useActionState(testAction ?? (async () => null), null);
  const setField = (key: string, field: string, v: Json) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] as Record<string, Json>), [field]: v } }));

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="blocks" value={JSON.stringify(draft)} />
      {blocks.map((b) => {
        const value = draft[b.key] as Record<string, Json>;
        const def = b.def as Record<string, Json>;
        return (
          <fieldset key={b.key} className="flex flex-col gap-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5" data-block={b.key}>
            {blocks.length > 1 && <legend className="px-1 font-display text-[20px] text-ink">{b.name}</legend>}
            {Object.keys(def).map((field) => (
              <Field
                key={field}
                id={`${b.key}.${field}`}
                label={human(field)}
                hint={hints[field]}
                def={def[field]}
                value={value[field] ?? def[field]}
                lines={LINE_LISTS.has(field)}
                onChange={(v) => setField(b.key, field, v)}
              />
            ))}
          </fieldset>
        );
      })}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-border bg-bg/95 px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : saveLabel}
        </Button>
        {testAction && (
          <button type="submit" formAction={testFormAction} disabled={testPending} className="rounded-[var(--radius-pill)] border border-border px-4 py-2 text-[14px] font-medium text-fg hover:bg-shade">
            {testPending ? "Sending…" : "Send me a test"}
          </button>
        )}
        {state && <p role="status" className={`text-[14px] ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
        {testState && <p role="status" className={`text-[14px] ${testState.ok ? "text-success" : "text-danger"}`}>{testState.message}</p>}
      </div>
    </form>
  );
}

function Field({ id, label, hint, def, value, lines, onChange }: { id: string; label: string; hint?: string; def: Json; value: Json; lines: boolean; onChange: (v: Json) => void }) {
  const head = (
    <span className="mb-1 block">
      <span className="text-[14px] font-medium text-fg">{label}</span>
      {hint && <span className="ml-2 text-[13px] text-subtle">{hint}</span>}
    </span>
  );

  if (typeof def === "string") {
    const long = def.length > 70 || def.includes("\n");
    return (
      <label className="block" htmlFor={id}>
        {head}
        {long ? (
          <textarea id={id} rows={Math.min(10, Math.max(3, Math.ceil(String(value).length / 80) + String(value).split("\n").length))} className={input} value={String(value)} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} className={input} value={String(value)} onChange={(e) => onChange(e.target.value)} />
        )}
      </label>
    );
  }

  if (Array.isArray(def) && typeof def[0] === "number") {
    return (
      <label className="block" htmlFor={id}>
        {head}
        <input
          id={id}
          className={input}
          defaultValue={(value as number[]).join(", ")}
          onChange={(e) => onChange(e.target.value.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0))}
        />
      </label>
    );
  }

  if (Array.isArray(def) && lines) {
    return (
      <label className="block" htmlFor={id}>
        {head}
        <textarea id={id} rows={Math.max(3, (value as string[]).length)} className={input} value={(value as string[]).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
      </label>
    );
  }

  if (isItems(def)) {
    const items = value as { title: string; body: string }[];
    const set = (next: typeof items) => onChange(next as Json);
    return (
      <div>
        {head}
        <ol className="flex flex-col gap-2">
          {items.map((it, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-[12px] border border-border p-3">
              <input aria-label={`${label} ${i + 1}: heading`} className={input} value={it.title} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <textarea aria-label={`${label} ${i + 1}: text`} rows={2} className={input} value={it.body} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
              <div className="flex gap-3 text-[13px] text-subtle">
                <button type="button" disabled={i === 0} onClick={() => set(items.map((x, j) => (j === i - 1 ? items[i] : j === i ? items[i - 1] : x)))} className="hover:text-fg disabled:opacity-40">Move up</button>
                <button type="button" disabled={i === items.length - 1} onClick={() => set(items.map((x, j) => (j === i + 1 ? items[i] : j === i ? items[i + 1] : x)))} className="hover:text-fg disabled:opacity-40">Move down</button>
                <button type="button" onClick={() => set(items.filter((_, j) => j !== i))} className="ml-auto hover:text-danger">Remove</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => set([...items, { title: "", body: "" }])} className="mt-2 text-[14px] font-medium text-accent">Add one</button>
      </div>
    );
  }

  if (Array.isArray(def)) {
    const list = value as string[];
    return (
      <div>
        {head}
        <div className="flex flex-col gap-2">
          {list.map((t, i) => (
            <div key={i} className="flex gap-2">
              <textarea aria-label={`${label} ${i + 1}`} rows={3} className={input} value={t} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="self-start text-[13px] text-subtle hover:text-danger">Remove</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onChange([...list, ""])} className="mt-2 text-[14px] font-medium text-accent">Add one</button>
      </div>
    );
  }
  return null;
}

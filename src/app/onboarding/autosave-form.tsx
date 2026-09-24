"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SaveResult } from "./actions";

/**
 * One onboarding step's form. Saves itself a moment after the last change
 * (and on the way out), so closing the tab half way through loses nothing.
 * "Continue" saves once more and moves on. The server action decides what
 * each field means; this only decides when to call it.
 */
export function AutosaveForm({
  action,
  next,
  children,
  continueLabel = "Continue",
}: {
  action: (fd: FormData) => Promise<SaveResult>;
  next: string;
  children: React.ReactNode;
  continueLabel?: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string; warn?: boolean }>({ kind: "idle" });
  const [moving, startMoving] = useTransition();

  async function save(): Promise<SaveResult> {
    if (!form.current) return { ok: true };
    setState({ kind: "saving" });
    try {
      const result = await action(new FormData(form.current));
      setState(result.ok ? { kind: "saved", message: result.message, warn: result.warn } : { kind: "error", message: result.message ?? "That didn't save. Try again." });
      return result;
    } catch {
      setState({ kind: "error", message: "That didn't save. Check your connection and try again." });
      return { ok: false };
    }
  }

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
  }

  return (
    <form
      ref={form}
      onChange={schedule}
      onBlur={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) schedule();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        startMoving(async () => {
          const result = await save();
          if (result.ok && !result.warn) router.push(next);
        });
      }}
      className="flex flex-col gap-6"
    >
      {children}
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <button
          type="submit"
          disabled={moving}
          className="rounded-[var(--radius-pill)] bg-accent px-[26px] py-3 text-[15px] font-semibold text-accent-fg transition-colors duration-200 hover:bg-accent-hover disabled:opacity-60"
        >
          {moving ? "Saving…" : continueLabel}
        </button>
        <span aria-live="polite" className={`text-[13.5px] ${state.kind === "error" || state.warn ? "text-accent" : "text-subtle"}`}>
          {state.kind === "saving" && "Saving…"}
          {state.kind === "saved" && (state.message ?? "Saved")}
          {state.kind === "error" && state.message}
        </span>
      </div>
    </form>
  );
}

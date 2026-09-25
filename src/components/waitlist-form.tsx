"use client";

import { useActionState } from "react";
import { joinWaitlistAction, type WaitlistResult } from "@/app/actions";
import { Button } from "@/components/ui/button";

export type WaitlistCopy = {
  formTitle: string;
  roleLabel: string;
  roleRider: string;
  roleCoach: string;
  roleHorseCare: string;
  professionLabel: string;
  professionAny: string;
  emailLabel: string;
  consent: string;
  privacy: string;
  button: string;
};

/**
 * The coming soon page's sign-up (src/components/coming-soon.tsx).
 *
 * Works with JavaScript off: the action is a server action, so the form posts
 * and comes back rendered, and the "what do you do" picker is revealed by a
 * CSS :has() rule on the checked radio (.waitlist-profession in globals.css)
 * rather than by React state.
 */
export function WaitlistForm({ copy, professions }: { copy: WaitlistCopy; professions: { slug: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<WaitlistResult | null, FormData>(joinWaitlistAction, null);

  if (state?.ok) {
    return (
      <p className="rounded-[12px] bg-shade p-4 text-[15px] leading-[1.5] text-fg" role="status">
        {state.message}
      </p>
    );
  }

  const field =
    "w-full rounded-[12px] border border-border bg-white px-3.5 py-3.5 text-[16px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none wide:py-[13px] wide:text-[15px]";
  const roles = [
    { value: "rider", id: "role-rider", label: copy.roleRider },
    { value: "coach", id: "role-coach", label: copy.roleCoach },
    { value: "horse_care", id: "role-horse-care", label: copy.roleHorseCare },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-[13px] font-medium text-fg">{copy.roleLabel}</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roles.map((r, i) => (
            <span key={r.value}>
              {/* A real radio, visually hidden, so the label is the control:
                  keyboard and screen readers get the native behaviour and the
                  :checked state is what colours the pill and reveals the
                  picker below, with or without JavaScript. */}
              <input
                type="radio"
                name="role"
                id={r.id}
                value={r.value}
                defaultChecked={i === 0}
                className="peer sr-only"
                required
              />
              <label
                htmlFor={r.id}
                className="block cursor-pointer rounded-[var(--radius-pill)] border border-border px-3 py-[7px] text-[13px] font-medium text-fg transition-colors duration-200 peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              >
                {r.label}
              </label>
            </span>
          ))}
        </div>
      </fieldset>

      {professions.length > 0 && (
        <label className="waitlist-profession">
          <span className="text-[13px] font-medium text-fg">{copy.professionLabel}</span>
          <select name="profession" className={`${field} mt-2`} defaultValue="">
            <option value="">{copy.professionAny}</option>
            {professions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-[13px] font-medium text-fg">{copy.emailLabel}</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={`${field} mt-2`} />
      </label>

      {/* The honeypot. Off-screen rather than display:none, and with
          autocomplete off, so a browser never fills it for a real person but
          a form-filling bot still sees it in the markup. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="waitlist-website">Website</label>
        <input id="waitlist-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-fg">
        <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
        <span>{copy.consent}</span>
      </label>

      {state && !state.ok && (
        <p className="text-[14px] leading-[1.45] text-danger" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 w-full text-[15px]">
        {pending ? "Adding you" : copy.button}
      </Button>

      <p className="text-[13px] leading-[1.45] text-muted">{copy.privacy}</p>
    </form>
  );
}

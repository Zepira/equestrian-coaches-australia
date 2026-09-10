"use client";

import { useId, useState } from "react";
import { inputClass } from "@/components/ui/field";

// Plain password <input> plus a "Show"/"Hide" toggle — same visual chrome
// as every other text input in the app, just with a text button inside the
// field's right edge. Toggle is a real tab stop (not tabIndex={-1}) since a
// keyboard-only user should be able to reach it, not just a mouse user.
export function PasswordInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange">) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className="relative">
      <input
        {...props}
        id={props.id ?? id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-16 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 px-3.5 text-[13px] font-medium text-accent"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

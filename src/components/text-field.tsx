const FIELD_CLASSNAME =
  "w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted disabled:opacity-60";

type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  wrapperClassName?: string;
};

/**
 * A labelled text input or textarea, sharing the one styling this form uses
 * everywhere — was a 9x-repeated className string across profile-form.tsx's
 * headline/bio/suburb/state/postcode/qualifications/testimonial fields.
 * Same idea as `ContactChannelField`, just without the "show on profile"
 * checkbox that field also carries.
 */
export function TextField({
  label,
  name,
  type = "text",
  multiline = false,
  rows,
  placeholder,
  defaultValue,
  disabled = false,
  wrapperClassName = "block",
}: TextFieldProps) {
  return (
    <label className={wrapperClassName}>
      <span className="mb-1 block text-sm font-medium text-fg">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          className={FIELD_CLASSNAME}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          className={FIELD_CLASSNAME}
        />
      )}
    </label>
  );
}

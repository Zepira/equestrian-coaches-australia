/** The three-line/X hamburger button that opens and closes the mobile nav panel. */
export function MobileNavToggle({
  open,
  onToggle,
  colorClassName,
}: {
  open: boolean;
  onToggle: () => void;
  colorClassName: string;
}) {
  return (
    <button
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={onToggle}
      className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] md:hidden ${colorClassName}`}
    >
      <span className="relative block h-4 w-5">
        <span
          className={`absolute left-0 top-0 block h-0.5 w-5 bg-current transition-transform ${
            open ? "translate-y-[7px] rotate-45" : ""
          }`}
        />
        <span
          className={`absolute left-0 top-[7px] block h-0.5 w-5 bg-current transition-opacity ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`absolute left-0 top-[14px] block h-0.5 w-5 bg-current transition-transform ${
            open ? "-translate-y-[7px] -rotate-45" : ""
          }`}
        />
      </span>
    </button>
  );
}

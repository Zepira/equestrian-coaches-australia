import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="fade-in mx-auto flex max-w-[560px] flex-col items-center px-[18px] py-20 text-center wide:py-32">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">404</p>
      <h1 className="mt-2 font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:text-[56px] wide:leading-[0.98]">
        Nothing <em className="italic text-accent">here</em>.
      </h1>
      <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.5] text-muted wide:mt-4 wide:text-[16px]">
        That page doesn&apos;t exist — it may have moved, or the coach or clinic you&apos;re looking for is no longer listed.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 wide:flex-row">
        <LinkButton href="/search">Find a coach</LinkButton>
        <LinkButton href="/" variant="secondary">
          Back to home
        </LinkButton>
      </div>
    </div>
  );
}

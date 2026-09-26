import { createServiceSupabase } from "@/lib/supabase/service";
import { countView, liveSlot, slotHref, slotImage, SPONSORED, type Placement } from "@/lib/sponsors";

/**
 * A sponsor's slot on a page (M11), always labelled "Sponsored" and placed
 * outside any list of professionals. Renders nothing when nothing's booked.
 */
export async function SponsorSlot({ placement, guideId, professionId, areaId, className = "" }: { placement: Exclude<Placement, "newsletter">; guideId?: string | null; professionId?: string | null; areaId?: string | null; className?: string }) {
  const service = createServiceSupabase();
  if (!service) return null;
  const slot = await liveSlot(service, placement, { guideId, professionId, areaId });
  if (!slot) return null;
  await countView(service, slot.id);
  const href = slotHref(slot);
  return (
    <aside className={`rounded-[18px] border border-border bg-surface p-5 ${className}`} data-sponsor-slot={slot.id} aria-label={`${SPONSORED}: ${slot.sponsor.name}`}>
      <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-subtle">{SPONSORED} · {slot.sponsor.name}</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        {slot.image_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slotImage(service, slot.image_path)} alt="" className="h-24 w-full rounded-[12px] object-cover sm:w-40" loading="lazy" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] leading-[1.15] text-ink">{slot.headline}</p>
          {slot.body && <p className="mt-1.5 text-[14.5px] leading-[1.5] text-muted">{slot.body}</p>}
          {href && (
            <a href={href} rel="sponsored noopener" className="mt-2.5 inline-block text-[14.5px] font-medium text-accent underline-offset-2 hover:underline">
              {slot.link_label}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}

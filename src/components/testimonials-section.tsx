import { Button } from "@/components/ui/button";
import { TextField } from "@/components/text-field";

type Testimonial = { id: string; author_name: string; quote: string };

/** Coach profile editor's testimonials list + add/remove forms. */
export function TestimonialsSection({
  testimonials,
  configured,
  onAddTestimonial,
  onDeleteTestimonial,
}: {
  testimonials: Testimonial[];
  configured: boolean;
  onAddTestimonial: (formData: FormData) => void | Promise<void>;
  onDeleteTestimonial: (testimonialId: string, formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-lg font-semibold text-fg">Testimonials</h2>
      <div className="mt-3 flex flex-col gap-3">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-[var(--radius-tile)] border border-border bg-surface p-4"
          >
            <div>
              <p className="text-fg">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-1 text-sm text-muted">— {t.author_name}</p>
            </div>
            <form action={onDeleteTestimonial.bind(null, t.id)}>
              <button type="submit" className="text-sm text-danger">
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>

      <form action={onAddTestimonial} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          label="Rider name"
          name="author_name"
          disabled={!configured}
          wrapperClassName="block flex-1"
        />
        <TextField label="Quote" name="quote" disabled={!configured} wrapperClassName="block flex-[2]" />
        <Button type="submit" variant="secondary" disabled={!configured}>
          Add
        </Button>
      </form>
    </section>
  );
}

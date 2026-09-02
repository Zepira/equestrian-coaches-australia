type Photo = { id: string; url: string; storage_path: string };

/**
 * The coach profile editor's photo grid — thumbnails with a delete button
 * each, plus a placeholder tile. Actual uploading happens in the separate
 * `PhotoUploadForm` (its own client component, unrelated to this list).
 */
export function PhotoGallery({
  photos,
  configured,
  onDeletePhoto,
}: {
  photos: Photo[];
  configured: boolean;
  onDeletePhoto: (photoId: string, storagePath: string, formData: FormData) => void | Promise<void>;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-fg">Profile photos</span>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative h-20 w-20">
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs, not worth next/image config yet */}
            <img src={photo.url} alt="" className="h-full w-full rounded-[var(--radius-control)] object-cover" />
            {/* formAction, not a nested <form> — this button already lives
                inside the outer <form action={saveProfile}>, and HTML
                forbids a <form> inside a <form> (it silently breaks:
                browsers hoist the inner one out, so the button ends up
                submitting whichever form the DOM parser decided on,
                unpredictable across browsers/devices). A submit button's
                own formAction overrides the enclosing form's action for
                just that button — the correct way to have two different
                server actions in one <form>. */}
            <button
              type="submit"
              formAction={onDeletePhoto.bind(null, photo.id, photo.storage_path)}
              disabled={!configured}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-xs font-bold text-bg"
            >
              ×
            </button>
          </div>
        ))}
        <div className="h-20 w-20 rounded-[var(--radius-control)] bg-accent-soft" aria-hidden />
      </div>
    </div>
  );
}

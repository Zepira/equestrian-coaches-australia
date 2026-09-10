import { Button } from "@/components/ui/button";
import { deletePhoto, deleteVideo } from "./actions";
import { PhotoUploadForm } from "./photo-upload-form";
import { VideoUploadForm } from "./video-upload-form";

type Photo = { id: string; url: string; storage_path: string };

// Photos + video, together, at the top of the dashboard — both the display
// and the actual upload controls live in the same place now. Previously
// the photo grid rendered up here but the upload input was a separate
// <PhotoUploadForm> stranded after the whole profile form and the
// testimonials section, with no upload control for video at all.
export function MediaUploadForm({
  configured,
  photos,
  videoUrl,
  videoActive,
}: {
  configured: boolean;
  photos: Photo[];
  videoUrl: string | null;
  /** Whether this coach's subscription currently unlocks video (see
   *  requireVideoTierCoach in actions.ts for why this isn't a real tier
   *  check yet). */
  videoActive: boolean;
}) {
  return (
    <div className="flex flex-col gap-8 border-b border-border pb-8">
      <div>
        <span className="mb-2 block text-sm font-medium text-fg">Profile photos</span>
        <div className="flex flex-wrap gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative h-36 w-36 sm:h-44 sm:w-44">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs, not worth next/image config yet */}
              <img
                src={photo.url}
                alt=""
                className="h-full w-full rounded-[var(--radius-tile)] object-cover"
              />
              {/* Its own <form>, not nested — this whole section sits
                  outside the profile-save <form> now, so there's no HTML
                  form-in-form problem to route around with formAction the
                  way the old bottom-of-page version had to. */}
              <form action={deletePhoto.bind(null, photo.id, photo.storage_path)}>
                <button
                  type="submit"
                  disabled={!configured}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-fg text-sm font-bold text-bg"
                >
                  ×
                </button>
              </form>
            </div>
          ))}
          <div className="flex h-36 w-36 items-center justify-center rounded-[var(--radius-tile)] bg-accent-soft sm:h-44 sm:w-44" aria-hidden />
        </div>
        <div className="mt-4">
          <PhotoUploadForm configured={configured} />
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-fg">Intro video</span>
        {!videoActive ? (
          <p className="text-sm text-muted">
            Video is available on paid plans — subscribe in{" "}
            <a href="/dashboard/billing" className="font-medium text-accent">
              Billing
            </a>{" "}
            to add one.
          </p>
        ) : videoUrl ? (
          <div className="max-w-sm">
            <video src={videoUrl} controls className="w-full rounded-[var(--radius-tile)]" />
            <form action={deleteVideo} className="mt-2">
              <Button type="submit" variant="danger-ghost">
                Remove video
              </Button>
            </form>
          </div>
        ) : (
          <VideoUploadForm configured={configured} />
        )}
      </div>
    </div>
  );
}

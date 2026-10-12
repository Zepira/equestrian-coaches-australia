"use client";

import { useState } from "react";
import { videoEmbed } from "@/lib/video-embed";

/**
 * A professional's intro video. A YouTube or Vimeo link shows a still and a
 * play button, and the player only loads when someone presses it: until
 * then nothing from either service runs on the page, which is what our
 * cookies page promises. An older uploaded file (a storage address) plays
 * in an ordinary video element.
 */
export function IntroVideo({ url, title, className = "" }: { url: string; title: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const embed = videoEmbed(url);

  if (!embed) {
    return <video src={url} controls preload="metadata" className={`w-full rounded-[16px] ${className}`} />;
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-[16px] bg-ink-deep ${className}`} data-intro-video={embed.provider}>
      {playing ? (
        <iframe
          src={embed.embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 flex items-center justify-center" aria-label={`Play ${title}`}>
          {embed.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- a third-party still, sized by its box
            <img src={embed.poster} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-95" />
          )}
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-transform group-hover:scale-105">
            <svg aria-hidden viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          <span className="absolute bottom-3 left-3 rounded-[var(--radius-pill)] bg-ink-deep/80 px-2.5 py-1 text-[11.5px] text-ink-fg">
            Plays from {embed.provider === "youtube" ? "YouTube" : "Vimeo"}
          </span>
        </button>
      )}
    </div>
  );
}

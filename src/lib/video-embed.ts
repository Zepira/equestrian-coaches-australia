/**
 * Intro videos are YouTube or Vimeo links, not files we host: an upload big
 * enough to be worth watching is far past what Vercel lets a request carry,
 * a hosted file eats the storage everyone shares, and both services stream
 * at the right quality for a phone. Safe to import anywhere.
 */
export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  id: string;
  /** The tidy address we store: https://www.youtube.com/watch?v=… or https://vimeo.com/… */
  canonical: string;
  /** The player address: YouTube's no-cookie host, Vimeo with do-not-track on. */
  embedUrl: string;
  /** A still to show before anything loads, where one exists without an API call. */
  poster: string | null;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function videoEmbed(input: string | null | undefined): VideoEmbed | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");

  let yt: string | null = null;
  if (host === "youtu.be") yt = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") yt = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      if (m) yt = m[1];
    }
  }
  if (yt && YT_ID.test(yt)) {
    return {
      provider: "youtube",
      id: yt,
      canonical: `https://www.youtube.com/watch?v=${yt}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`,
      poster: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    // An unlisted video carries a private hash, in the path
    // (vimeo.com/123/abc12) or as ?h= on a player link; it has to travel
    // with the id or the player refuses it.
    const m = url.pathname.match(/(?:^|\/)(\d{6,12})(?:\/([0-9a-f]{6,20}))?(?:\/|$)/);
    if (m) {
      const hash = m[2] ?? url.searchParams.get("h");
      const h = hash && /^[0-9a-f]{6,20}$/.test(hash) ? hash : null;
      return {
        provider: "vimeo",
        id: m[1],
        canonical: `https://vimeo.com/${m[1]}${h ? `/${h}` : ""}`,
        embedUrl: `https://player.vimeo.com/video/${m[1]}?${h ? `h=${h}&` : ""}autoplay=1&dnt=1`,
        poster: null,
      };
    }
  }
  return null;
}

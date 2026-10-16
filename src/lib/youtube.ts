// Reads the channel's public RSS feed at build time, so new uploads appear after the next deploy.
// No API key needed. If the feed is empty or unreachable the site falls back to the videos in src/content/videos.
import { site } from "./site";

export type FeedVideo = { id: string; title: string; published: Date; description: string };

let cache: Promise<FeedVideo[]> | undefined;
export function channelVideos(): Promise<FeedVideo[]> {
  cache ??= (async () => {
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${site.youtubeChannelId}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const xml = await res.text();
      return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
        id: e.match(/<yt:videoId>([^<]+)/)?.[1] ?? "",
        title: decode(e.match(/<title>([^<]*)/)?.[1] ?? ""),
        published: new Date(e.match(/<published>([^<]+)/)?.[1] ?? 0),
        description: decode(e.match(/<media:description>([^<]*)/)?.[1] ?? ""),
      })).filter((v) => v.id);
    } catch { return []; }
  })();
  return cache;
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
